import { createContext } from "react";
import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export const DoctorContext = createContext();

const DoctorContextProvider = (props) => {

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [dToken, setDToken] = useState(localStorage.getItem('dToken') ? localStorage.getItem('dToken') : '')
  const [appointments, setAppointments] = useState([])
  const [dashData, setDashData] = useState(false)
  const [profileData, setProfileData] = useState(false)

  const getAppointments = async () => {
    try {
      const {data} = await axios.get(backendUrl + '/api/doctor/appointments', {headers: {dToken}} )

      if(data.success){
        setAppointments(data.appointments)
        // console.log("vaii sara appointment mil gya : ",data.appointments)
      } else{
        toast.error(data.message)
      }

    } catch (error) {
      console.log(error)
      toast.error(error.message)
    }
  }


  // mark appointement as complete
  const completeAppointment = async (appointmentId) => {
  try {
    const { data } = await axios.post(
      backendUrl + "/api/doctor/complete-appointment",
      { appointmentId },
      { headers: { dToken } }
    );

    if (data.success) {
      toast.success(data.message);
      getAppointments(); //appointment table update
      getDashData();     //dashboard update
    } else {
      toast.error(data.message);
    }
  } catch (error) {
    console.log(error);
    toast.error(error.message);
  }
};


  // cancel appointement
  const cancelAppointment = async (appointmentId) => {
  try {
    const { data } = await axios.post(
      backendUrl + "/api/doctor/cancel-appointment",
      { appointmentId },
      { headers: { dToken } }
    );

    if (data.success) {
      toast.success(data.message);
      getAppointments(); // appointment list update
      getDashData();     //dashboard instant update
    } else {
      toast.error(data.message);
    }
  } catch (error) {
    console.log(error);
    toast.error(error.message);
  }
};


  // dashBoard data for doctor panel
  const getDashData = async () => {
    try {
      const {data} = await axios.get(backendUrl + '/api/doctor/dashboard', {headers: {dToken}} )
      
      if(data.success){
        setDashData(data.dashData)
        // console.log("vaii dashData mil gya : ",data.dashData)
      } else{
        toast.error(data.message)
      }
    } catch (error) {
      console.log(error)
      toast.error(error.message)
    }
  }

  // profile data for doctor panel
  const getProfileData = async () => {
    try {
       const {data} = await axios.get(backendUrl + '/api/doctor/profile', {headers: {dToken}} )
       if(data.success)
       {
        setProfileData(data.profileData) 
        console.log("profile data mil gya doctor panel ka : ",data.profileData)
       }
    } catch (error) {
      console.log(error)
      toast.error(error.message)
    }
  }

  const value = {
    dToken,
    setDToken,
    backendUrl,
    appointments,
    setAppointments,
    getAppointments,
    completeAppointment,
    cancelAppointment,
    dashData, setDashData, getDashData,
    profileData, setProfileData, getProfileData
  };

  return (
    <DoctorContext.Provider value={value}>
      {props.children}
    </DoctorContext.Provider>
  );
};

export default DoctorContextProvider;
