import { apiRequest } from '../utils/fetchClient.js';

const resendBox = document.getElementById("resendBox");
const timerDisplay = document.querySelector("#timer");
const verifyBtn = document.querySelector(".verify");
const otpInputs = document.querySelectorAll(".otp-inputs input");

// Auto-advance logic
otpInputs.forEach((input, index) => {
    // Allow only numbers
    input.addEventListener("input", (e) => {
        // Enforce numeric only and single character
        const value = e.target.value.replace(/[^0-9]/g, "");

        if (value.length > 0) {
            // Take only the first character if accidentally multiple
            e.target.value = value.charAt(0);

            // Move to next input automatically
            if (index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        }
    });

    // Handle backspace → move to previous
    input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !input.value && index > 0) {
            otpInputs[index - 1].focus();
        }
    });

    // Handle paste of full OTP
    input.addEventListener("paste", (e) => {
        e.preventDefault();
        const pasteData = e.clipboardData.getData("text").replace(/\D/g, "");
        if (pasteData.length === otpInputs.length) {
            otpInputs.forEach((box, i) => {
                box.value = pasteData[i] || "";
            });
            otpInputs[otpInputs.length - 1].focus();
        }
    });
});

// Disable resend initially
if (resendBox) resendBox.classList.add("disabled");

function startTimer(resendDuration, expiryDuration, display) {
    let resendTimer = resendDuration;
    let expiryTimer = expiryDuration;

    const interval = setInterval(() => {
        // Handle Resend Timer
        if (resendTimer > 0) {
            const minutes = Math.floor(resendTimer / 60);
            const seconds = resendTimer % 60;
            if (display) {
                display.textContent = `Resend in ${(minutes < 10 ? "0" : "") + minutes}:${(seconds < 10 ? "0" : "") + seconds}`;
            }
            resendTimer--;
        } else if (resendTimer === 0) {
            if (resendBox) {
                resendBox.classList.remove("disabled");
                resendBox.style.opacity = "1";
                resendBox.style.pointerEvents = "auto";
            }
            if (display) display.textContent = "Resend available";
            resendTimer = -1; // Stop updating resend status
        }

        // Handle OTP Expiry
        if (expiryTimer <= 0) {
            clearInterval(interval);
            if (display) display.textContent = "Expired";
            if (resendBox) {
                resendBox.classList.remove("disabled");
                resendBox.style.opacity = "1";
                resendBox.style.pointerEvents = "auto";
            }
            if (verifyBtn) {
                verifyBtn.disabled = true;
                verifyBtn.style.background = "#ccc";
                verifyBtn.style.opacity = "0.5";
            }
            return;
        }

        expiryTimer--;
    }, 1000);
    return interval;
}

// Verification Form AJAX
const otpForm = document.querySelector('form');
if (otpForm) {
    otpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(otpForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const result = await apiRequest(otpForm.action, 'POST', data);

            if (result.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: result.message,
                    showConfirmButton: false,
                    timer: 1500
                }).then(() => {
                    window.location.href = result.redirectUrl || '/home';
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Verification Failed',
                    text: result.message || 'Invalid OTP',
                    confirmButtonColor: '#3b82f6'
                }).then(() => {
                    if (result.redirectUrl) {
                        window.location.href = result.redirectUrl;
                    }
                });
            }
        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.message || 'Something went wrong. Please try again later.',
                confirmButtonColor: '#3b82f6'
            });
        }
    });
}

// Resend OTP AJAX
const resendLink = document.querySelector('#resendBox a');
if (resendLink) {
    resendLink.addEventListener('click', async (e) => {
        e.preventDefault();
        if (resendBox.classList.contains('disabled')) return;

        try {
            const result = await apiRequest(resendLink.getAttribute('href'), 'GET');

            if (result.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'OTP Sent',
                    text: result.message,
                    showConfirmButton: false,
                    timer: 1500
                });

                // Reset inputs and focus
                otpInputs.forEach(input => input.value = "");
                if (otpInputs[0]) otpInputs[0].focus();

                // Restart timer if expiry provided
                if (result.otpExpires && result.resendExpires) {
                    const expiryTime = new Date(result.otpExpires).getTime();
                    const resendExpTime = new Date(result.resendExpires).getTime();
                    const now = Date.now();
                    const expirySeconds = Math.floor((expiryTime - now) / 1000);
                    const resendSeconds = Math.floor((resendExpTime - now) / 1000);

                    if (expirySeconds > 0) {
                        if (timerDisplay) timerDisplay.textContent = "";
                        resendBox.classList.add("disabled");
                        resendBox.style.opacity = "0.5";
                        resendBox.style.pointerEvents = "none";
                        if (verifyBtn) {
                            verifyBtn.disabled = false;
                            verifyBtn.style.background = ""; // Reset to default
                            verifyBtn.style.opacity = "1";
                        }
                        if (window.otpInterval) clearInterval(window.otpInterval);
                        window.otpInterval = startTimer(resendSeconds, expirySeconds, timerDisplay);
                    }
                }
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: result.message || 'Unable to resend OTP',
                    confirmButtonColor: '#3b82f6'
                });
            }
        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.message || 'Something went wrong. Please try again later.',
                confirmButtonColor: '#3b82f6'
            });
        }
    });
}

window.onload = function () {
    // Reset Inputs
    otpInputs.forEach(input => input.value = "");
    if (otpInputs[0]) otpInputs[0].focus();

    const expiryInput = document.getElementById("otpExpiryValue");
    const resendInput = document.getElementById("resendExpiryValue");

    const expiryTime = expiryInput ? parseInt(expiryInput.value) : 0;
    const resendExpTime = resendInput ? parseInt(resendInput.value) : 0;

    if (!isNaN(expiryTime) && expiryTime > 0) {
        const now = Date.now();
        const expirySeconds = Math.floor((expiryTime - now) / 1000);
        const resendSeconds = Math.floor((resendExpTime - now) / 1000);

        if (expirySeconds > 0) {
            if (window.otpInterval) clearInterval(window.otpInterval);
            window.otpInterval = startTimer(resendSeconds, expirySeconds, timerDisplay);
        } else {
            if (timerDisplay) timerDisplay.textContent = "Expired";
            if (resendBox) {
                resendBox.classList.remove("disabled");
                resendBox.style.opacity = "1";
                resendBox.style.pointerEvents = "auto";
            }
            if (verifyBtn) {
                verifyBtn.disabled = true;
                verifyBtn.style.background = "#ccc";
                verifyBtn.style.opacity = "0.5";
            }
        }
    } else {
        if (timerDisplay) timerDisplay.textContent = "Expired";
        if (resendBox) {
            resendBox.style.opacity = "1";
            resendBox.style.pointerEvents = "auto";
        }
    }
};
