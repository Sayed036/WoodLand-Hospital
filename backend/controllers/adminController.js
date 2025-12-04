import fs from "fs";
import validator from "validator";
import bcrypt from "bcrypt";
import { v2 as cloudinary } from "cloudinary";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";
import { json } from "stream/consumers";

// API for adding Doctor
const addDoctor = async (req, res) => {
  // console.log("BODY ->", req.body);
  // console.log("FILE ->", req.file);

  // console.log(req.body);

  try {
    const {
      name,
      email,
      password,
      speciality,
      degree,
      experience,
      about,
      fees,
      address,
    } = req.body;
    const imageFile = req.file;

    if (!imageFile) {
      return res.json({ success: false, message: "Image not found" });
    }

    // console.log(`makavosra chalo image dekhtwe hai - `);
    // console.log(imageFile);

    // checking for all data to add doctor
    if (
      !name ||
      !email ||
      !password ||
      !speciality ||
      !degree ||
      !experience ||
      !about ||
      !fees ||
      !address
    ) {
      return res.json({ success: false, message: "Missing details1" });
    }

    // validating email format
    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: "Please enter  valid email" });
    }

    // validating strong passsword
    if (password.length < 6) {
      return res.json({
        success: false,
        message: "Please enter a strong password",
      });
    }

    // hashing doctor password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // console.log(`makavosra kiya mujhe mil gaya ?`);

    // upload image to Cloudinary
    // upload image to Cloudinary with retry
    let uploadedImage;
    const maxRetries = 3;

    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`Cloudinary upload attempt ${i + 1}...`);

        const imageBuffer = fs.readFileSync(imageFile.path);
        const base64Image = imageBuffer.toString("base64");
        const dataUri = `data:${imageFile.mimetype};base64,${base64Image}`;

        uploadedImage = await cloudinary.uploader.upload(dataUri, {
          folder: "doctors",
          timeout: 180000, // 3 minute ka time out hai ye
        });

        console.log("Upload SUCCESS:", uploadedImage.secure_url);
        break; // success mila toh loop se bahar ho jaaunga
      } catch (err) {
        console.log(`Attempt ${i + 1} failed:`, err.message || err);
        if (i === maxRetries - 1) {
          return res.json({
            success: false,
            message: "Image upload failed after 3 attempts",
          });
        }
        // 2 second wait krega bhai, fir start hoga dubara
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    const imageURL = uploadedImage.secure_url;

    const doctorData = {
      name,
      email,
      image: imageURL,
      password: hashedPassword,
      speciality,
      degree,
      experience,
      about,
      fees,
      address: JSON.parse(address),
      date: Date.now(),
    };

    // console.log(`Docktor ki - ${doctorData}`);

    const newDoctor = new doctorModel(doctorData);

    await newDoctor.save();

    res.json({ success: true, message: "Doctor Added to Database" });
  } catch (error) {
    console.log(error);
    res.json({
      success: false,
      message: `Doctor add nahi hua error - ${error.message}`,
    });
  }
};

// API for the ADMIN login
const loginAdmin = async (req, res) => {
  try {
    let { email, password } = req.body;
    if (
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const token = jwt.sign(email + password, process.env.JWT_SECRET);
      res.json({ success: true, token });
    } else {
      res.json({ success: false, message: "Invalid Credentials" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get all doctors list for admin panel

const allDoctors = async (req, res) => {
  try {
    const doctors = await doctorModel.find({}).select("-password");
    res.json({ success: true, doctors });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get all appointments list for admin panel
const appointmentsAdmin = async (req, res) => {
  try {
    const appointments = await appointmentModel.find({}).sort({ date: -1 });
    res.json({ success: true, appointments });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
}


// API for appointment cancellation by admin
const appointmentCancel = async (req, res) => {
  try {
    const { appointmentId } = req.body;

    const appointmentData = await appointmentModel.findById(appointmentId);

    await appointmentModel.findByIdAndUpdate(appointmentId, {cancelled: true} )

    // release doctor slot
    const {docId, slotDate, slotTime} = appointmentData;

    const doctorData = await doctorModel.findById(docId)
    let slots_booked = doctorData.slots_booked || {}

    slots_booked[slotDate] = slots_booked[slotDate].filter(e=> e !== slotTime)

    await doctorModel.findByIdAndUpdate(docId, {slots_booked})

    res.json({ success: true, message: "Appointment Cancelled" });

  } catch (error) {
    console.log("cancel appointment error:", error);
    return res.json({ success: false, message: error.message });
  }
}


// API to get dashboard data for admin panel
const adminDashboard = async (req, res) => {
  try {
    const doctors = await doctorModel.find({});
    const users = await userModel.find({})
    const appointments = await appointmentModel.find({})

    const dashData = {
      doctors: doctors.length,
      patients: users.length,
      appointments: appointments.length,
      latestAppointments: [...appointments].reverse().slice(0, 5),
    }

    res.json({success: true, dashData});

  } catch (error) {
    console.log("dashboard error h vaii :", error);
    return res.json({ success: false, message: error.message });
  }
}

export { addDoctor, loginAdmin, allDoctors, appointmentsAdmin, appointmentCancel, adminDashboard };
