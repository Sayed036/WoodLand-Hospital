import React, { useContext } from "react";
import { AppContext } from "../context/AppContext";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const MyAppointments = () => {
  const { backendUrl, token, getDoctorsData } = useContext(AppContext);
  const [appointments, setAppointments] = useState([]);
  const navigate = useNavigate();

  const getUserAppointments = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/user/appointments`, {
        headers: { token },
      });

      if (data.success) {
        setAppointments(data.appointments.reverse());
      } else {
        console.error("Failed to fetch appointments:", data.message);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error(error.message);
    }
  };

  // Cancel appointment
  const cancelAppointment = async (appointmentId) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/user/cancel-appointment`,
        { appointmentId },
        { headers: { token } }
      );

      if (data.success) {
        toast.success(data.message);
        getUserAppointments();
        getDoctorsData();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Cancel appointment error:", error);
      toast.error(error.message);
    }
  };

  const initPay = (order) => {
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: "INR",
      name: "RoseWood Hospital Payment",
      description: "Appointment Payment",
      order_id: order.id,
      receipt: order.receipt,
      handler: async (response) => {
        try {
          const { data } = await axios.post(
            `${backendUrl}/api/user/verifyRazorpay`,
            response,
            { headers: { token } }
          );

          if (data.success) {
            getUserAppointments();
            navigate("/my-appointments");
            toast.success(data.message);
          }
        } catch (error) {
          toast.error("Payment verification failed", error);
        }
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  // Razorpay start
  const appointmentRazorpay = async (appointmentId) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/user/payment-razorpay`,
        { appointmentId },
        { headers: { token } }
      );

      if (data.success) {
        initPay(data.order);
      }
    } catch (error) {
      console.log("Init pay error:", error);
    }
  };

  // pdf download
  const downloadPDF = async (id) => {
  try {
    const res = await axios.get(
      `${backendUrl}/api/user/appointment-pdf/${id}`,
      {
        headers: { token },
        responseType: "blob", // IMPORTANT
      }
    );

    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = "appointment.pdf";
    link.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.log(error);
    toast.error("PDF download failed");
  }
};


  useEffect(() => {
    if (token) getUserAppointments();
  }, [token]);

  // polling to auto-refresh statuses
  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => getUserAppointments(), 12000);
    return () => clearInterval(id);
  }, [token]);

  return (
    <div>
      <p className="pb-3 mt-12 font-bold text-2xl text-zinc-700 border-b border-gray-300">
        My Appointments
      </p>

      <div>
        {appointments.map((item, idx) => {
          const isCompleted = item.isCompleted === true;
          const isCancelled = item.cancelled === true;

          return (
            <div
              className="grid grid-cols-[1fr_2fr] gap-4 sm:flex sm:gap-6 py-2 border-b border-gray-300"
              key={idx}
            >
              <div>
                <img
                  className="w-32 bg-indigo-50"
                  src={item.docData.image}
                  alt={item.docData.name}
                />
              </div>

              <div className="flex-1 text-sm text-zinc-600">
                <p className="text-neutral-800 font-semibold">
                  {item.docData.name}
                </p>
                <p>{item.docData.speciality}</p>
                <p className="text-zinc-700 font-medium mt-1">Address:</p>
                <p>{item.docData.address?.line1}</p>
                <p>{item.docData.address?.line2}</p>
                <p className="text-sm mt-1">
                  <span className="font-medium text-neutral-700">
                    Date & Time:
                  </span>{" "}
                  {item.slotDate} | {item.slotTime}
                </p>
              </div>

              <div className="flex flex-col gap-2 justify-end">

                {/* Completed */}
                {isCompleted && !isCancelled && (
                  <p className="sm:min-w-48 py-2 rounded text-emerald-600 font-semibold">
                    Completed
                  </p>
                )}

                {/* Cancelled */}
                {isCancelled && (
                  <p className="sm:min-w-48 py-2 rounded text-red-600 font-semibold">
                    Appointment Cancelled
                  </p>
                )}

                {/* Actions (only when NOT completed or cancelled) */}
                {!isCompleted && !isCancelled && (
                  <>
                    {item.payment ? (
                      <button className="sm:min-w-48 py-2 border rounded bg-indigo-50 text-stone-500">
                        Paid
                      </button>
                    ) : (
                      <button
                        onClick={() => appointmentRazorpay(item._id)}
                        className="sm:min-w-48 py-2 border rounded hover:bg-emerald-400 hover:text-white transition-all cursor-pointer"
                      >
                        Pay Online
                      </button>
                    )}

                    <button
                      onClick={() => cancelAppointment(item._id)} 
                      className="sm:min-w-48 py-2 border rounded hover:bg-red-400 hover:text-white transition-all cursor-pointer"
                    >
                      Cancel Appointment
                    </button>
                  </>
                )}

                {/* PDF Download (Always Available) */}
                <button
                  onClick={() => downloadPDF(item._id)}
                  className="group relative inline-flex items-center justify-center gap-2 px-6 py-3 
                            bg-linear-to-r from-blue-600 to-indigo-600 
                            text-white font-medium text-sm rounded-xl
                            shadow-lg hover:shadow-xl
                            transform hover:-translate-y-0.5 
                            transition-all duration-300 ease-out
                            overflow-hidden cursor-pointer"
                >
                  {/* Shining effect */}
                  <span className="absolute inset-0 w-full h-full bg-white opacity-0 
                                  group-hover:opacity-20 transition-opacity duration-500 
                                  -translate-x-full group-hover:translate-x-full 
                                  skew-x-12" />

                  {/* PDF Icon */}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>

                  <span>Download PDF</span>

                  {/* Download arrow animation on hover */}
                  <svg className="w-5 h-5 ml-2 opacity-0 group-hover:opacity-100 
                                  -translate-x-2.5 group-hover:translate-x-0 
                                  transition-all duration-300" 
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>                 

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MyAppointments;
