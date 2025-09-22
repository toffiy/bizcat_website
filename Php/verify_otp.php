<?php
// Allow cross-origin requests (for local frontend)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

// Enable error reporting for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Start session to access stored OTP
session_start();

// Get POST data
$email = $_POST['email'] ?? null;
$otp   = $_POST['otp'] ?? null;

// Basic input validation
if (!$email || !$otp) {
    echo json_encode(["success" => false, "message" => "Missing email or OTP"]);
    exit;
}

$email = filter_var($email, FILTER_SANITIZE_EMAIL);
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(["success" => false, "message" => "Invalid email format"]);
    exit;
}

if (!preg_match('/^\d{6}$/', $otp)) {
    echo json_encode(["success" => false, "message" => "Invalid OTP format"]);
    exit;
}

// Check session-stored OTP
if (
    isset($_SESSION['otp'], $_SESSION['otp_email'], $_SESSION['otp_expiry']) &&
    $_SESSION['otp_email'] === $email &&
    $_SESSION['otp'] == $otp &&
    time() < $_SESSION['otp_expiry']
) {
    // OTP is valid → clear session
    unset($_SESSION['otp'], $_SESSION['otp_email'], $_SESSION['otp_expiry']);
    echo json_encode(["success" => true, "message" => "OTP verified"]);
} else {
    echo json_encode(["success" => false, "message" => "Invalid or expired OTP"]);
}
