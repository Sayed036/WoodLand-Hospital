import validator from "validator";
import bcrypt from "bcrypt";
import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import Razorpay from "razorpay";
import PDFDocument from "pdfkit";
import axios from "axios";
import qr from "qrcode";
import { sendEmail } from "../utils/emailService.js";

// API , user register ke liye
const registerUser = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.json({ success: false, message: "Missing details !" });
    }

    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: "Enter a valid Email" });
    }

    if (password.length < 6) {
      return res.json({ success: false, message: "Enter a Strong Password" });
    }

    const existing = await userModel.findOne({ email });
    if (existing) {
      return res.json({ success: false, message: "Email already registered" });
    }

    // password hash kr rhe hai bhai
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // use data save krenge , database me
    const userData = {
      name,
      email,
      password: hashedPassword,
    };

    // database me save ho gya !! yeyyyyy
    const newUser = new userModel(userData);
    const user = await newUser.save();

    // ab banaenge token , _id ki help se , jo ki databse me save hai, mtlb user ka use krke

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    res.json({ success: true, token });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API user login krne ke liye.
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.json({ success: false, message: "User does not exist" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
      res.json({ success: true, token });
    } else {
      res.json({ success: false, message: "Invalid Credentials" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get user Profile Data
const getProfile = async (req, res) => {
  try {
    const userData = await userModel.findById(req.userId).select("-password");

    res.json({ success: true, userData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to update user Profile Data
const updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, phone, address, dob, gender } = req.body;
    const imageFile = req.file;

    if (!name || !phone || !dob || !gender) {
      return res.json({ success: false, message: "Data Missing!" });
    }

    // field update ho gai
    await userModel.findByIdAndUpdate(userId, {
      name,
      phone,
      address: JSON.parse(address),
      dob,
      gender,
    });

    // image update ho gyaaaa
    if (imageFile) {
      // cloudinary pe image upload krenge, agr image user ne daala tb
      const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
        resource_type: "image",
      });
      const imageUrl = imageUpload.secure_url;

      await userModel.findByIdAndUpdate(userId, { image: imageUrl });
      console.log("Profle image url mil gya vai : ", imageUrl);
    }

    res.json({ success: true, message: "Profile Updated Successfully" });

  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};


// API to book Appointment
const bookAppointment = async (req, res) => {
  try {
    const userId = req.userId;
    const { docId, slotDate, slotTime } = req.body;

    // validation
    if (!userId || !docId || !slotDate || !slotTime) {
      return res.json({ success: false, message: "Missing details" });
    }

    // fetch doctor
    const docData = await doctorModel.findById(docId).select("-password");
    if (!docData) {
      return res.json({ success: false, message: "Doctor not found" });
    }
    if (!docData.available) {
      return res.json({ success: false, message: "Doctor Not Available" });
    }

    // ATOMIC: try to push the slot only if it doesn't already exist
    // Condition: slots_booked.slotDate != slotTime
    const updatedDoc = await doctorModel.findOneAndUpdate(
      {
        _id: docId,
        [`slots_booked.${slotDate}`]: { $ne: slotTime }, // ensure slotTime not present in that date array
      },
      {
        $push: { [`slots_booked.${slotDate}`]: slotTime }, // push the slot
      },
      {
        new: true,
      }
    );

    // agr slots already booked hai is time and date ke liye, then error de dena
    if (!updatedDoc) {
      return res.json({ success: false, message: "Slot Not Available" });
    }

    // get user data
    const userData = await userModel.findById(userId).select("-password");
    if (!userData) {
      // rollback: remove the pushed slot because user not found (optional safety)
      await doctorModel.findByIdAndUpdate(docId, {
        $pull: { [`slots_booked.${slotDate}`]: slotTime },
      });
      return res.json({ success: false, message: "User not found" });
    }

    // sanitize doctor data to remove slots_booked from saved appointment copy
    const docDataObj = updatedDoc.toObject();
    delete docDataObj.slots_booked;

    const appointmentData = {
      userId,
      docId,
      userData: userData.toObject ? userData.toObject() : userData,
      docData: docDataObj,
      amount: docData.fees,
      slotTime,
      slotDate,
      date: Date.now(),
    };

    const newAppointment = new appointmentModel(appointmentData);
    await newAppointment.save();

    // Send Email Notification to User
    sendEmail(
      appointmentData.userData.email,
      "Appointment Confirmed - RoseWood Hospital",
      `
        <h2>Appointment Confirmed ✔</h2>
        <p>Dear ${appointmentData.userData.name},</p>
        <p>Your appointment has been successfully booked at <b>RoseWood Hospital</b>.</p>

        <h3>Appointment Details:</h3>
        <p><b>Doctor:</b> ${appointmentData.docData.name}</p>
        <p><b>Speciality:</b> ${appointmentData.docData.speciality}</p>
        <p><b>Date:</b> ${appointmentData.slotDate}</p>
        <p><b>Time:</b> ${appointmentData.slotTime}</p>

        <br/>
        <p>Thank you for choosing <b>RoseWood Hospital</b>.</p>
        <p>Stay Healthy ❤️</p>
      `
    );

    // success
    return res.json({ success: true, message: "Appointment Booked" });
  } catch (error) {
    console.log("bookAppointment error:", error);
    return res.json({ success: false, message: error.message });
  }
};


// API to get user appointments for "My Appointments"
const listAppointments = async (req, res) => {
  try {
    const userId = req.userId;
    const appointments = await appointmentModel.find({userId})
    res.json({ success: true, appointments });
  } catch (error) {
    console.log("bookAppointment error:", error);
    return res.json({ success: false, message: error.message });
  }
}

// API to cancel Appointment
const cancelAppointment = async (req, res) => {
  try {
    const userId = req.userId;
    const { appointmentId } = req.body;

    const appointmentData = await appointmentModel.findById(appointmentId);

    // verify appointment user
    if (appointmentData.userId !== userId) {
      return res.json({ success: false, message: "Unauthorized action" });
    }
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

// razorpay instance

const paymentRazorpay = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const appointmentData = await appointmentModel.findById(appointmentId);

    if (!appointmentData || appointmentData.cancelled) {
      return res.json({ success: false, message: "Appointment cancelled or not found" });
    }

    // ye instance andr bana rhe hai, taaki .env file already load rahe.
    const razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: appointmentData.amount * 100,
      currency: "INR",
      receipt: appointmentId,
    };

    const order = await razorpayInstance.orders.create(options);

    res.json({ success: true, order });
  } catch (error) {
    console.log("Razorpay error:", error.message);
    res.json({ success: false, message: error.message });
  }
};


//API to verify Razorpay payment and update appointment
const verifyRazorpay = async (req, res) => {
  try {
    const { razorpay_order_id } = req.body;

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const orderInfo = await razorpay.orders.fetch(razorpay_order_id);
    // return res.json({ success: true, order });
    // console.log(orderInfo)
    if(orderInfo.status === 'paid'){
      await appointmentModel.findByIdAndUpdate(orderInfo.receipt, {payment: true})
      return  res.json({ success: true, message: "Payment successful" });
    } else{
      return res.status(400).json({ success: false, message: "Payment failed" });
    }

  } catch (error) {
    console.log("Razorpay payment varified me error aya hai bhai : ",error)
    return res.status(400).json({ success: false, message: error.message });
  }
};

// API to generate appointment PDF
const appointmentPDF = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await appointmentModel.findById(id);
    if (!appointment) {
      return res.json({ success: false, message: "Appointment not found" });
    }

    // Security check
    if (appointment.userId !== req.userId) {
      return res.json({ success: false, message: "Not Authorized" });
    }

    // Create PDF with margin
    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=appointment.pdf"
    );

    doc.pipe(res);


    //  LOAD CLOUDINARY LOGO

    const logoUrl =
      "https://res.cloudinary.com/dpqy0c8rd/image/upload/f_png/v1764877505/logo_ra8cuu.png";

    const logoResponse = await axios.get(logoUrl, {
      responseType: "arraybuffer",
    });
    const logoBuffer = Buffer.from(logoResponse.data);

    // Logo LEFT
    doc.image(logoBuffer, 40, 40, { width: 80 });


    //  HOSPITAL HEADER (CENTERED)

    doc
      .fontSize(22)
      .fillColor("#1a1a1a")
      .text("RoseWood Hospital", { align: "center" });

    doc
      .moveDown(0.3)
      .fontSize(10)
      .fillColor("gray")
      .text("MG Road, Bangalore • Contact: +91 9876543210", {
        align: "center",
      });

    doc.moveDown(2);


    //  TITLE

    doc
      .fontSize(16)
      .fillColor("#333")
      .text("Appointment Receipt", { align: "center" });

    doc.moveDown(0.8);

    // Divider
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();

    doc.moveDown(1);


    //  APPOINTMENT DETAILS

    doc.fontSize(12).fillColor("#000");
    doc.text(`Patient Name: ${appointment.userData.name}`, 40);
    doc.text(`Doctor: ${appointment.docData.name}`, 40);
    doc.text(`Speciality: ${appointment.docData.speciality}`, 40);
    doc.text(`Date: ${appointment.slotDate}`, 40);
    doc.text(`Time: ${appointment.slotTime}`, 40);
    doc.text(`Fees: ${appointment.amount}/-`, 40);

    doc.moveDown(1);

    // Status Coloring
    let status = "Pending";
    let color = "orange";

    if (appointment.cancelled) {
      status = "Cancelled";
      color = "red";
    }

    if (appointment.isCompleted) {
      status = "Completed";
      color = "green";
    }

    doc.fontSize(14).fillColor(color).text(`Status: ${status}`, 40);
    doc.fillColor("#000");

    doc.moveDown(1.5);

    //  QR CODE (CENTERED)
    const qrData = `Appointment ID: ${appointment._id}`;
    const qrImage = await qr.toDataURL(qrData);

    doc.text("Verification QR Code:", {
      align: "center",
      underline: true,
    });

    const pdfWidth = doc.page.width;
    const qrWidth = 130;
    const qrX = (pdfWidth - qrWidth) / 2; // center

    doc.image(qrImage, qrX, doc.y + 10, { width: qrWidth });

    doc.moveDown(8);

    //  FOOTER
    doc
      .fontSize(10)
      .fillColor("gray")
      .text("Thank you for choosing RoseWood Hospital.", {
        align: "center",
      });

    doc.end();
  } catch (error) {
    console.log("PDF ERROR:", error);
    if (!res.headersSent) {
      res.json({ success: false, message: error.message });
    }
  }
};

export { registerUser, loginUser, getProfile, updateProfile, bookAppointment, listAppointments, cancelAppointment, paymentRazorpay, verifyRazorpay, appointmentPDF };
