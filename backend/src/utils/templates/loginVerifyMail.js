export const verifyEmail = (email, otp) => {
    return (
        `
        <!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification - Smart Career Counselling</title>
    <style>
        body{
            padding: 0;
            margin: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f4f4;
            color: #333;
        }
        .email-container{
            max-width: 600px;
            margin: 40px auto;
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            overflow: hidden;
        }
        .header{
            background: linear-gradient(135deg, #7c3aed, #4f46e5);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1{
            margin: 0;
            font-size: 24px;
            font-weight: 700;
        }
        .content{
            padding: 40px 30px;
        }
        .content h2{
            color: #333;
            margin-bottom: 20px;
        }
        .content p{
            line-height: 1.6;
            margin-bottom: 20px;
            color: #666;
        }
        .otp-box{
            text-align: center;
            margin: 30px 0;
        }
        .otp-code{
            display: inline-block;
            font-size: 36px;
            font-weight: 800;
            letter-spacing: 10px;
            color: #4f46e5;
            background-color: #f0f0ff;
            padding: 18px 32px;
            border-radius: 12px;
            border: 2px dashed #c7c3f9;
        }
        .footer{
            background-color: #f8f8f8;
            padding: 20px 30px;
            text-align: center;
            border-top: 1px solid #eee;
        }
        .footer p{
            margin: 0;
            color: #999;
            font-size: 14px;
        }
        .security-notice{
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            margin: 20px 0;
            border-radius: 8px;
        }
        .security-notice p{
            margin: 0;
            color: #856404;
            font-size: 14px;
        }
    </style>
</head>

<body>
    <div class="email-container">
        <div class="header">
            <h1>Email Verification</h1>
        </div>

        <div class="content">
            <h2>Hello ${email},</h2>
            
            <p>Thank you for registering with Smart Career Counselling. To complete your registration, please use the OTP code below:</p>
            
            <div class="otp-box">
                <div class="otp-code">${otp}</div>
            </div>

            <p style="text-align:center; color:#888; font-size:14px;">Enter this code on the verification page</p>
            
            <div class="security-notice">
                <p><strong>Security Notice:</strong> This OTP will expire in 5 minutes. If you didn't create an account with us, please ignore this email.</p>
            </div>
        </div>

        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Smart Career Counselling. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>

</html>
        `
    )
}
