import { apiRequest } from '../utils/fetchClient.js';

// OTP Verification Logic
const resendBox = document.getElementById("resendBox");
const timerDisplay = document.querySelector("#timer");
const verifyBtn = document.querySelector(".verify");
const otpInputs = document.querySelectorAll(".otp-inputs input");
const otpExpiryInput = document.getElementById("otpExpiryValue");

// Auto-advance logic
otpInputs.forEach((input, index) => {
    // Allow only numbers
    input.addEventListener("input", (e) => {
        input.value = input.value.replace(/[^0-9]/g, "");

        // Move to next input automatically
        if (input.value && index < otpInputs.length - 1) {
            otpInputs[index + 1].focus();
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

function startTimer(duration, display) {
    let timer = duration;
    const interval = setInterval(() => {
        if (timer <= 0) {
            clearInterval(interval);
            if (display) display.textContent = "Expired";

            // Enable resend when timer ends
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

        const minutes = Math.floor(timer / 60);
        const seconds = timer % 60;
        if (display) {
            display.textContent =
                (minutes < 10 ? "0" : "") + minutes + ":" +
                (seconds < 10 ? "0" : "") + seconds;
        }

        timer--;
    }, 1000);
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
                if (result.otpExpires) {
                    const expiryTime = new Date(result.otpExpires).getTime();
                    const now = Date.now();
                    const secondsLeft = Math.floor((expiryTime - now) / 1000);

                    if (secondsLeft > 0) {
                        if (timerDisplay) timerDisplay.textContent = "";
                        resendBox.classList.add("disabled");
                        resendBox.style.opacity = "0.5";
                        resendBox.style.pointerEvents = "none";
                        if (verifyBtn) {
                            verifyBtn.disabled = false;
                            verifyBtn.style.background = ""; // Reset to default
                            verifyBtn.style.opacity = "1";
                        }
                        startTimer(secondsLeft, timerDisplay);
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

    const expiryTime = otpExpiryInput ? parseInt(otpExpiryInput.value) : 0;

    if (expiryTime > 0 && !isNaN(expiryTime)) {
        const now = Date.now();
        const secondsLeft = Math.floor((expiryTime - now) / 1000);

        if (secondsLeft > 0) {
            startTimer(secondsLeft, timerDisplay);
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
        if (timerDisplay) timerDisplay.textContent = "No active OTP";
        if (resendBox) {
            resendBox.style.opacity = "1";
            resendBox.style.pointerEvents = "auto";
        }
    }
};
