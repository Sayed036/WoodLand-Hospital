import doctorModel from "../models/doctorModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import appointmentModel from "../models/appointmentModel.js";

const checkAvailability = async (req, res) => {
  try {
    const { docId } = req.body;

    const docData = await doctorModel.findById(docId);
    await doctorModel.findByIdAndUpdate(docId, {
      available: !docData.available,
    });
    res.json({ success: true, message: "Availability changed" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// doctor list for showing the doctor on frontend page
const doctorList = async (req, res) => {
  try {
    const doctors = await doctorModel.find({}).select(["-password", "-email"]);
    res.json({ success: true, doctors });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};


// API for doctor Login
const loginDoctor = async (req, res) => {
  try {

    const { email, password } = req.body;
    
    const doctor = await doctorModel.findOne({ email });
    if (!doctor) {
      return res.json({ success: false, message: "Invalid Credentials" });
    }

    const isMatch = await bcrypt.compare(password, doctor.password);

    if(isMatch){
      const token = jwt.sign({ id: doctor._id }, process.env.JWT_SECRET);
      res.json({ success: true,token });
    }else {
      res.json({ success: false, message: "Invalid Credentials" });
    }
    
  } catch (error) {
    console.log("Login doctor me problem hai vai(catch) : ",error);
    res.json({ success: false, message: error.message });
  }
}


// API to get doctor appointments for doctor panel
const appointmentsDoctor = async (req, res) => {
  try {
    const docId = req.docId;
    if (!docId) {
      return res.status(401).json({ success: false, message: "Doctor not authenticated" });
    }
    const appointments = await appointmentModel.find({docId})
    res.json({success: true, appointments})
  } catch (error) {
    console.log("All Appointent doctor(doctor panel) me problem hai vaii(catch) : ",error);
    res.json({ success: false, message: error.message });
  }
}


// API to mark appointment as completed by doctor(doctor panel)
const appointmentComplete = async (req, res) => {
  try {
    const docId = req.docId;
    const { appointmentId } = req.body;

    if (!docId) {
      return res.status(401).json({ success: false, message: "Doctor not authenticated" });
    }

    const appointmentData = await appointmentModel.findById(appointmentId);

    if (!appointmentData) {
      return res.json({ success: false, message: "Appointment not found" });
    }

    // FIXED COMPARISON (ObjectId vs string)
    if (appointmentData.docId.toString() !== docId.toString()) {
      return res.json({ success: false, message: "Not allowed" });
    }

    // PREVENT completing cancelled appointments
    if (appointmentData.cancelled) {
      return res.json({ success: false, message: "Cannot complete a cancelled appointment" });
    }

    await appointmentModel.findByIdAndUpdate(appointmentId, {
      isCompleted: true
    });

    res.json({ success: true, message: "Appointment completed" });

  } catch (error) {
    console.log("Complete Appointment Error:", error);
    res.json({ success: false, message: error.message });
  }
};


// API to cancel appointment as completed by doctor(doctor panel)
const appointmentCancel = async (req, res) => {
  try {
    const docId = req.docId;
    const { appointmentId } = req.body;

    if (!docId) {
      return res.status(401).json({ success: false, message: "Doctor not authenticated" });
    }

    const appointmentData = await appointmentModel.findById(appointmentId);

    if (!appointmentData) {
      return res.json({ success: false, message: "Appointment not found" });
    }

    
    if (appointmentData.docId.toString() !== docId.toString()) {
      return res.json({ success: false, message: "Not allowed" });
    }

    // Do not cancel completed appointments
    if (appointmentData.isCompleted) {
      return res.json({ success: false, message: "Cannot cancel a completed appointment" });
    }

    await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true });

    res.json({ success: true, message: "Appointment Cancelled" });

  } catch (error) {
    console.log("Cancel Appointment Error:", error);
    res.json({ success: false, message: error.message });
  }
};



// API to get dahsboard data for doctor panel
const doctorDashboard = async (req, res) => {
  try {
    const docId = req.docId;

    if (!docId) {
      return res.status(401).json({ success: false, message: "Doctor not authenticated" });
    }

    const appointments = await appointmentModel.find({docId})

    let earnings = 0

    appointments.map( (item)=> {
      if(item.isCompleted || item.payment){
        earnings += item.amount
      }
    } )

    let patients = []
    appointments.map( (item) => {
      if(!patients.includes(item.userId)){
        patients.push(item.userId)
      }
    })

    const dashData = {
      earnings,
      appointments: appointments.length,
      patients: patients.length,
      latestAppointments: appointments.reverse().slice(0,5)
    }

    res.json({success: true, dashData})
  } catch (error) {
    console.log("Dashboard me problem(doc Panel) hai vaii(catch) : ",error);
    res.json({ success: false, message: error.message });
  }
}

// API to get doctorProfile for doctor panel
const doctorProfile = async (req, res) => {
  try {
    const docId = req.docId;

    if (!docId) {
      return res.status(401).json({ success: false, message: "Doctor not authenticated" });
    }

    const profileData = await doctorModel.findById(docId).select("-password")
    res.json({success: true, profileData})
  } catch (error) {
    console.log("Profile me problem(doc Panel) hai vaii(catch) : ",error);
    res.json({ success: false, message: error.message });
  }
}

// API to update doctorProfile for doctor panel
const updateDoctorProfile = async (req, res) => {
  try {
    const docId = req.docId;
    const {fees, address, available} = req.body;

    if (!docId) {
      return res.status(401).json({ success: false, message: "Doctor not authenticated" });
    }

    await doctorModel.findByIdAndUpdate(docId, {
      fees,
      address,
      available
    })

    res.json({success: true, message: "Profile Updated Successfully"})
  } catch (error) {
    console.log("Update Profile me problem(doc Panel) hai vaii(catch) : ",error);
    res.json({ success: false, message: error.message });
  }
}

export { checkAvailability, doctorList, loginDoctor, appointmentsDoctor, appointmentComplete, appointmentCancel, doctorDashboard, doctorProfile, updateDoctorProfile };
