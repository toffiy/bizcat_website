<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'vendor/autoload.php'; // PHPMailer
require 'config.php';          // your private credentials

session_start();
header('Content-Type: application/json');

// Get email from request
$email = $_POST['email'] ?? null;
$email = filter_var($email, FILTER_SANITIZE_EMAIL);

if (!$email) {
    echo json_encode(["success" => false, "message" => "Invalid email"]);
    exit;
}

// Generate OTP
$otp = rand(100000, 999999);
$_SESSION['otp'] = $otp;
$_SESSION['otp_email'] = $email;
$_SESSION['otp_expiry'] = time() + 300; // 5 minutes

$mail = new PHPMailer(true);

try {
    // Server settings
    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = SMTP_USER;
    $mail->Password   = SMTP_PASS;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = 587;

    // Recipients
    $mail->setFrom(SMTP_FROM, SMTP_NAME);
    $mail->addAddress($email);

    // Content
    $mail->isHTML(true);
    $mail->Subject = 'Your OTP Code';
    $mail->Body    = "Your OTP code is <b>$otp</b>. It expires in 5 minutes.";

    $mail->send();
    echo json_encode(["success" => true, "message" => "OTP sent"]);
} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Mailer Error: {$mail->ErrorInfo}"]);
}
