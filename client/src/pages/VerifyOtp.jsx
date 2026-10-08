import { useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";

function VerifyOTP() {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const userId = location.state?.userId;
  console.log("User ID:", userId);

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    console.log("Sending:", { userId, otp });
    try {
      const response = await axios.post(
        "http://localhost:5000/api/users/verify-otp",
        {
          userId,
          otp,
        },
        {
          withCredentials: true,
        },
      );

      console.log(response.data);
      navigate("/");
    } catch (error) {
      setError(error.response?.data?.message || "OTP verification failed");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>ThoughtStream</h1>
        <h2>Verify your email</h2>
        <p>Enter the OTP sent to your email.</p>

        <form onSubmit={handleVerifyOTP}>
          <div className="form-group">
            <label>OTP</label>
            <input
              type="text"
              placeholder="Enter your OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </div>

          {error && <p>{error}</p>}

          <button type="submit">Verify OTP</button>
        </form>
      </div>
    </div>
  );
}

export default VerifyOTP;