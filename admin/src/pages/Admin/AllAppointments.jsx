import React from 'react'
import { useContext } from 'react'
import { AdminContext } from '../../context/AdminContext'
import { useEffect } from 'react'
import { AppContext } from '../../context/AppContext'
import { assets } from '../../assets/assets'

function AllAppointments() {

  const {aToken, appointments, getAllAppointments, cancelAppointment} = useContext(AdminContext)
  const {calculateAge, currency} = useContext(AppContext)

  useEffect( ()=> {
    if(aToken)
    {
      getAllAppointments()
    }

  }, [aToken] )

  return (
    <div className='w-full max-w-6xl font-light'>
      <p className='mb-3 text-lg font-bold'>All Appointments</p>

      <div className='bg-white border border-gray-200 rounded text-sm max-h-[80vh] min-h-[60vh] overflow-y-scroll'>
        <div className='hidden sm:grid grid-cols-[0.5fr_3fr_1fr_3fr_3fr_1fr_1fr] grid-flow-col py-3 px-6 border-b border-gray-200'>
          <p>#</p>
          <p>Patient</p>
          <p>Age</p>
          <p>Date & Time</p>
          <p>Doctor</p>
          <p>Fees</p>
          <p>Actions</p>
        </div>

        {appointments.map( (item,idx)=> (
          <div className='flex flex-wrap justify-between max-sm:gap-2 sm:grid sm:grid-cols-[0.5fr_3fr_1fr_3fr_3fr_1fr_1fr] items-center text-gray-500 py-3 px-6 border-b border-gray-200 hover:bg-gray-50' key={idx}>
            <p className='max-sm:hidden'>{idx+1}</p>
            {/* user details */}
            <div className="flex items-center gap-3">
              <img 
                className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-md" 
                src={item.userData.image || "/default-avatar.jpg"} 
                alt={item.userData.name} 
              />
              <p className="text-sm font-medium">{item.userData.name}</p>
            </div>
            {/* // slot date & time */}
            <p className='max-sm:hidden'>{calculateAge(item.userData.dob)}</p>
            <p>{item.slotDate}, {item.slotTime}</p>
            {/* doc details */}
            <div className="flex items-center gap-3">
              <img 
                className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-md" 
                src={item.docData.image || "/default-avatar.jpg"} 
                alt={item.userData.name} 
              />
              <p className="text-sm font-medium">{item.docData.name}</p>
            </div>
            {/* // INR SHOW */}
            <p>{currency}{item.docData.fees}</p>
            {/* // adding cancel button for admin */}
            {item.cancelled
            ? <p className='text-red-500 text-xs font-medium'>Cancelled</p>
            : <img onClick={()=> cancelAppointment(item._id)} className='w-10 cursor-pointer' src={assets.cancel_icon} alt="" />
            }
          </div>
        ) )}

      </div>
    </div>
  )
}

export default AllAppointments
