<?php
header("Access-Control-Allow-Origin: https://toffiy.github.io");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

// --- INCLUDE PHPMailer ---
require __DIR__ . '/phpmailer/src/PHPMailer.php';
require __DIR__ . '/phpmailer/src/SMTP.php';
require __DIR__ . '/phpmailer/src/Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// --- READ INPUT ---
// Try JSON first
$raw = file_get_contents("php://input");
$data = json_decode($raw, true);

// Fallback to form POST
if (!$data) {
    $data = $_POST;
}

$email = $data['email'] ?? null;

if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(["success" => false, "message" => "No or invalid email"]);
    exit();
}

// --- GENERATE OTP ---
$otp = rand(100000, 999999);

// Save OTP temporarily (for testing we’ll log it, later link to DB/Firebase)
file_put_contents(__DIR__ . "/otp_log.txt", "$email : $otp\n", FILE_APPEND);

// --- SEND EMAIL ---
$mail = new PHPMailer(true);

try {
    // SMTP settings
    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = "tophercrisostomo18@gmail.com"; // your email
    $mail->Password   = "ygmr tnqx otji ohfr"; // Gmail App Password
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = 587;

    // Recipients
    $mail->setFrom("tophercrisostomo18@gmail.com", "BizCat OTP");
    $mail->addAddress($email);

    // Email content
    $mail->isHTML(true);
    $mail->Subject = "Your BizCat OTP Code";
    $mail->Body    = "<p>Your OTP code is: <b>$otp</b></p>";

    $mail->send();

    echo json_encode(["success" => true, "message" => "OTP sent"]);
} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Mailer Error: {$mail->ErrorInfo}"]);
}
