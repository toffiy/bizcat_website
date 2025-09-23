<?php
header("Access-Control-Allow-Origin: https://toffiy.github.io"); 
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
$email = $data['email'] ?? null;
$otp   = $data['otp'] ?? null;

if (!$email || !$otp) {
    echo json_encode(["success" => false, "message" => "Missing email or OTP"]);
    exit();
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(["success" => false, "message" => "Invalid email format"]);
    exit();
}

if (!preg_match('/^\d{6}$/', $otp)) {
    echo json_encode(["success" => false, "message" => "Invalid OTP format"]);
    exit();
}

// Firebase path (same key as send_otp.php)
$firebaseUrl = "https://YOUR_PROJECT_ID.firebaseio.com/otps/" . md5($email) . ".json";

// Fetch OTP data from Firebase
$response = file_get_contents($firebaseUrl);
$otpData = json_decode($response, true);

if ($otpData && $otpData['otp'] == $otp && time() < $otpData['expiry']) {
    // OTP is valid → delete from Firebase
    $ch = curl_init($firebaseUrl);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "DELETE");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_exec($ch);
    curl_close($ch);

    echo json_encode(["success" => true, "message" => "OTP verified"]);
} else {
    echo json_encode(["success" => false, "message" => "Invalid or expired OTP"]);
}
