import { assets } from "../assets/assets";
import { NavLink } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useContext, useState } from "react";
import { AppContext } from "../context/AppContext";

function Navbar() {
  const navigate = useNavigate();

  const { token, setToken, userData } = useContext(AppContext);

  const [showMenu, setShowMenu] = useState(false);
  // const [token, setToken] = useState(true);

  // drop down option in profile pic
  const [showDropdown, setShowDropdown] = useState(false);

  const logOut = () => {
    setToken(false);
    localStorage.removeItem("token");
    navigate('/')
  };

  return (
    <nav
      id="navbar"
      className="flex items-center justify-between py-4 mb-5 border-b border-b-gray-400"
    >
      <img
        onClick={() => navigate("/")}
        className="w-44 cursor-pointer"
        src={assets.logo}
        alt=""
      />

      <ul className="hidden md:flex items-start gap-5 font-medium ">
        <NavLink to="/">
          <li className="py-1">HOME</li>
          <hr className="border-none outline-none h-0.5 bg-[#b03053] w-3/5 m-auto hidden" />
        </NavLink>

        <NavLink to="/doctors">
          <li className="py-1">ALL DOCTORS</li>
          <hr className="border-none outline-none h-0.5 bg-[#b03053] w-3/5 m-auto hidden" />
        </NavLink>

        <NavLink to="/about">
          <li className="py-1">ABOUT</li>
          <hr className="border-none outline-none h-0.5 bg-[#b03053] w-3/5 m-auto hidden" />
        </NavLink>

        <NavLink to="/contact">
          <li className="py-1">CONTACT</li>
          <hr className="border-none outline-none h-0.5 bg-[#b03053] w-3/5 m-auto hidden" />
        </NavLink>
      </ul>

      <div className="flex items-center gap-4">
        {token && userData ? (
          <div
            className="flex items-center gap-2 cursor-pointer group relative"
            onClick={() => setShowDropdown(!showDropdown)} // mobile toggle
          >
            <img
              className="w-8 h-8 rounded-full object-cover"
              src={userData.image}
              alt=""
            />
            <img className="w-2.5" src={assets.dropdown_icon} alt="" />

            {/*------------ DROPDOWN ---------------*/}
            <div
              className={`
                  absolute top-0 right-0 pt-14 text-base font-medium text-gray-600 z-20
                  ${showDropdown ? "block" : "hidden"}      // mobile click
                  group-hover:block                          // desktop hover
                `}
            >
              <div className="min-w-48 bg-stone-100 rounded flex flex-col gap-4 p-4">
                <p
                  onClick={() => {
                    setShowDropdown(false);
                    navigate("/my-profile");
                  }}
                  className="hover:text-black cursor-pointer"
                >
                  MyProfile
                </p>

                <p
                  onClick={() => {
                    setShowDropdown(false);
                    navigate("/my-appointments");
                  }}
                  className="hover:text-black cursor-pointer"
                >
                  MyAppointments
                </p>

                <p
                  onClick={() => {
                    logOut();
                    setShowDropdown(false);
                    // setToken(false);
                  }}
                  className="hover:text-black cursor-pointer"
                >
                  Logout
                </p>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              // console.log("object");
              navigate("/login");
            }}
            className="bg-[#b03053] text-white px-8 py-3 rounded-full hidden md:block cursor-pointer"
          >
            Create/Login account
          </button>
        )}

        <img
          onClick={() => setShowMenu(true)}
          className="w-6 md:hidden"
          src={assets.menu_icon}
          alt=""
        />

        {/* ------Mobile menu------- */}
        <div
          className={` ${
            showMenu ? "fixed w-full" : "h-0 w-0"
          } md:hidden right-0 top-0 bottom-0 z-20 overflow-hidden bg-white transition-all`}
        >
          <div className="flex items-center justify-between px-5 py-6">
            <img className="w-36" src={assets.logo} alt="" />
            <img
              className="w-7"
              onClick={() => setShowMenu(false)}
              src={assets.cross_icon}
              alt=""
            />
          </div>

          <ul className="flex flex-col items-center gap-2 mt-5 px-5 text-lg font-medium">
            <NavLink onClick={() => setShowMenu(false)} to="/">
              <p className="px-4 py-2 rounded inline-block">Home</p>
            </NavLink>

            <NavLink onClick={() => setShowMenu(false)} to="/doctors">
              <p className="px-4 py-2 rounded inline-block">All Doctors</p>
            </NavLink>

            <NavLink onClick={() => setShowMenu(false)} to="/about">
              <p className="px-4 py-2 rounded inline-block">About</p>
            </NavLink>

            <NavLink onClick={() => setShowMenu(false)} to="/contact">
              <p className="px-4 py-2 rounded inline-block">Contact</p>
            </NavLink>
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
