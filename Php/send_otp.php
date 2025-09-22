<?php
// --- CORS HEADERS ---
header("Access-Control-Allow-Origin: https://toffiy.github.io"); // whitelist your GitHub Pages domain
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// --- LOAD COMPOSER AUTOLOADER ---
require __DIR__ . '/../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// --- READ INPUT ---
$data = json_decode(file_get_contents("php://input"), true);
$email = $data['email'] ?? null;

if (!$email) {
    echo json_encode(["success" => false, "message" => "No email provided"]);
    exit();
}

// --- GENERATE OTP ---
$otp = rand(100000, 999999);

// TODO: Store OTP in your DB or Firebase for later verification
// For now, just log it (InfinityFree has no DB by default)
file_put_contents(__DIR__ . "/otp_log.txt", "$email : $otp\n", FILE_APPEND);

// --- SEND EMAIL ---
$mail = new PHPMailer(true);

try {
    // Server settings
    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com';   // or your SMTP provider
    $mail->SMTPAuth   = true;
    $mail->Username   = 'yourgmail@gmail.com';   // replace with your email
    $mail->Password   = 'your-app-password';     // use App Password, not your real Gmail password
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = 587;

    // Recipients
    $mail->setFrom('yourgmail@gmail.com', 'BizCat OTP');
    $mail->addAddress($email);

    // Content
    $mail->isHTML(true);
    $mail->Subject = 'Your BizCat OTP Code';
    $mail->Body    = "<p>Your OTP code is: <b>$otp</b></p>";

    $mail->send();

    echo json_encode(["success" => true, "message" => "OTP sent"]);
} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Mailer Error: {$mail->ErrorInfo}"]);
}
