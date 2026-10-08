import { useState } from "react";
import axios from "axios";
import {useNavigate} from "react-router-dom"

function ForgotPassword() {

    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleForgotPassword = async (e) => {
        e.preventDefault();

        setMessage("");
        setError("");

        try {
            const response = await axios.post(
                "http://localhost:5000/api/users/forgot-password",
                {
                    email
                }
            );

            navigate(`/reset-password/${response.data.resetToken}`);

            setMessage(response.data.message);

        } catch (error) {
            setError(error.response?.data?.message || "Something went wrong");
        }
    };

    return (
        <div className="auth-page">

            <div className="auth-container">

                <h1>ThoughtStream</h1>

                <h2>Forgot your password?</h2>

                <p>
                    Enter your email and we'll help you reset your password.
                </p>

                <form onSubmit={handleForgotPassword}>

                    <div className="form-group">

                        <label>Email</label>

                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                    </div>

                    <button type="submit">
                        Continue
                    </button>

                </form>

                {message && (
                    <p className="success-message">
                        {message}
                    </p>
                )}

                {error && (
                    <p className="error-message">
                        {error}
                    </p>
                )}

                <p className="auth-switch">
                    Remember your password?
                    <a href="/login"> Log in</a>
                </p>

            </div>

        </div>
    );
}

export default ForgotPassword;