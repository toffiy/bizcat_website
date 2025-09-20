<?php
session_start();
header('Content-Type: application/json');

$email = $_POST['email'] ?? null;
$otp   = $_POST['otp'] ?? null;

if (!$email || !$otp) {
    echo json_encode(["success" => false, "message" => "Invalid input"]);
    exit;
}

if (
    isset($_SESSION['otp'], $_SESSION['otp_email'], $_SESSION['otp_expiry']) &&
    $_SESSION['otp_email'] === $email &&
    $_SESSION['otp'] == $otp &&
    time() < $_SESSION['otp_expiry']
) {
    unset($_SESSION['otp'], $_SESSION['otp_email'], $_SESSION['otp_expiry']);
    echo json_encode(["success" => true, "message" => "OTP verified"]);
} else {
    echo json_encode(["success" => false, "message" => "Invalid or expired OTP"]);
}
