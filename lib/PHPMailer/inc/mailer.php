<?php
// /lib/PHPMailer/inc/mailer.php

declare(strict_types=1);

function _wp_mailer_send(
    string $toEmail,
    string $toName,
    string $subject,
    string $htmlBody,
    string $textBody
): array {
    // ---- PHPMailer include paths ----
    $root = realpath(__DIR__ . '/..'); // -> /lib/PHPMailer
    if ($root === false) {
        return ["ok" => false, "error" => "PHPMailer root not found"];
    }

    $exc = $root . '/src/Exception.php';
    $php = $root . '/src/PHPMailer.php';
    $smt = $root . '/src/SMTP.php';

    if (!file_exists($exc) || !file_exists($php) || !file_exists($smt)) {
        return ["ok" => false, "error" => "PHPMailer src files missing. Expected: {$exc}, {$php}, {$smt}"];
    }

    require_once $exc;
    require_once $php;
    require_once $smt;

    // ---- SMTP CONFIG ----
    // ✅ CN mismatch խնդիրը լուծվում է, եթե Host-ը նույնն է ինչ certificate CN-ը
    $SMTP_HOST = 'mail.pmstudio.am';
    $SMTP_PORT = 465; // TLS 587 կամ SSL 465
    $SMTP_USER = 'no-reply@worship.pmstudio.am';
    $SMTP_PASS = 'Worship.2026'; // ⚠️ փոխիր BrainyCP-ում ու այստեղ թարմացրու
    $SMTP_SEC  = 'ssl'; // 'tls' կամ 'ssl'

    $FROM_EMAIL = $SMTP_USER;
    $FROM_NAME  = 'Worship Platform';

    try {
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        $mail->CharSet = 'UTF-8';

        $mail->isSMTP();
        $mail->Host       = $SMTP_HOST;
        $mail->SMTPAuth   = true;
        $mail->Username   = $SMTP_USER;
        $mail->Password   = $SMTP_PASS;
        $mail->Port       = $SMTP_PORT;

        if ($SMTP_SEC === 'ssl') {
            $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS; // 465
        } else {
            $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS; // 587
        }

        // From / To
        $mail->setFrom($FROM_EMAIL, $FROM_NAME);
        $mail->addAddress($toEmail, $toName);

        $mail->Subject = $subject;
        $mail->Body    = $htmlBody;
        $mail->AltBody = $textBody;
        $mail->isHTML(true);

        $mail->send();
        return ["ok" => true, "error" => ""];
    } catch (Throwable $e) {
        return ["ok" => false, "error" => $e->getMessage()];
    }
}

function send_reset_email(string $toEmail, string $toName, string $resetLink): array
{
    $safeLink = htmlspecialchars($resetLink, ENT_QUOTES, 'UTF-8');
    $displayName = trim($toName) !== '' ? $toName : 'ընկեր';

    $subject = 'Worship Platform — Գաղտնաբառի վերականգնում';

    $textBody =
"Ողջույն, {$displayName}\n\n"
."Գաղտնաբառը փոխելու համար բացեք այս հղումը (գործում է 30 րոպե):\n"
.$resetLink."\n\n"
."Եթե դուք չեք պահանջել վերականգնում, պարզապես անտեսեք այս նամակը։\n";

    $htmlBody = '
<!doctype html>
<html>
  <body style="margin:0;background:#05050A;padding:24px;font-family:Inter,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#12121A;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;">
      <div style="padding:18px 20px;background:linear-gradient(135deg,#9D72FF,#00F0FF);color:#fff;">
        <div style="font-weight:800;letter-spacing:.5px;font-size:16px;">WORSHIP PLATFORM</div>
        <div style="opacity:.9;font-size:13px;margin-top:6px;">Գաղտնաբառի վերականգնում</div>
      </div>

      <div style="padding:20px;color:#ffffff;line-height:1.55;">
        <p style="margin:0 0 12px;">Ողջույն, <b>'.htmlspecialchars($displayName, ENT_QUOTES, "UTF-8").'</b></p>
        <p style="margin:0 0 14px;">
          Գաղտնաբառը փոխելու համար սեղմեք ներքևի կոճակը։ Հղումը գործում է <b>30 րոպե</b>։
        </p>

        <p style="margin:18px 0;">
          <a href="'.$safeLink.'"
             style="display:inline-block;background:linear-gradient(135deg,#9D72FF,#00F0FF);color:#05050A;
                    text-decoration:none;font-weight:800;padding:12px 16px;border-radius:12px;">
            Փոխել գաղտնաբառը
          </a>
        </p>

        <p style="margin:0 0 10px;color:#A0A0B0;font-size:13px;">
          Եթե կոճակը չի աշխատում, բացեք այս հղումը՝
        </p>
        <p style="margin:0 0 14px;word-break:break-all;">
          <a href="'.$safeLink.'" style="color:#00F0FF;">'.$safeLink.'</a>
        </p>

        <p style="margin:0;color:#A0A0B0;font-size:13px;">
          Եթե դուք չեք պահանջել վերականգնում, պարզապես անտեսեք այս նամակը։
        </p>
      </div>

      <div style="padding:14px 20px;background:rgba(255,255,255,.03);color:#A0A0B0;font-size:12px;">
        © '.date('Y').' Worship Platform
      </div>
    </div>
  </body>
</html>';

    return _wp_mailer_send($toEmail, $displayName, $subject, $htmlBody, $textBody);
}

function send_verify_email(string $toEmail, string $toName, string $verifyLink): array
{
    $safeLink = htmlspecialchars($verifyLink, ENT_QUOTES, 'UTF-8');
    $displayName = trim($toName) !== '' ? $toName : 'ընկեր';

    $subject = 'Worship Platform — Email հաստատում';

    $textBody =
"Ողջույն, {$displayName}\n\n"
."Email-ը հաստատելու համար բացեք այս հղումը (գործում է 30 րոպե):\n"
.$verifyLink."\n\n"
."Եթե դուք չեք կատարել այս գործողությունը, պարզապես անտեսեք այս նամակը։\n";

    $htmlBody = '
<!doctype html>
<html>
  <body style="margin:0;background:#05050A;padding:24px;font-family:Inter,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#12121A;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;">
      <div style="padding:18px 20px;background:linear-gradient(135deg,#9D72FF,#00F0FF);color:#fff;">
        <div style="font-weight:800;letter-spacing:.5px;font-size:16px;">WORSHIP PLATFORM</div>
        <div style="opacity:.9;font-size:13px;margin-top:6px;">Email հաստատում</div>
      </div>

      <div style="padding:20px;color:#ffffff;line-height:1.55;">
        <p style="margin:0 0 12px;">Ողջույն, <b>'.htmlspecialchars($displayName, ENT_QUOTES, "UTF-8").'</b></p>
        <p style="margin:0 0 14px;">
          Email-ը հաստատելու համար սեղմեք ներքևի կոճակը։ Հղումը գործում է <b>30 րոպե</b>։
        </p>

        <p style="margin:18px 0;">
          <a href="'.$safeLink.'"
             style="display:inline-block;background:linear-gradient(135deg,#9D72FF,#00F0FF);color:#05050A;
                    text-decoration:none;font-weight:800;padding:12px 16px;border-radius:12px;">
            Հաստատել Email-ը
          </a>
        </p>

        <p style="margin:0 0 10px;color:#A0A0B0;font-size:13px;">
          Եթե կոճակը չի աշխատում, բացեք այս հղումը՝
        </p>
        <p style="margin:0 0 14px;word-break:break-all;">
          <a href="'.$safeLink.'" style="color:#00F0FF;">'.$safeLink.'</a>
        </p>

        <p style="margin:0;color:#A0A0B0;font-size:13px;">
          Եթե դուք չեք կատարել այս գործողությունը, պարզապես անտեսեք այս նամակը։
        </p>
      </div>

      <div style="padding:14px 20px;background:rgba(255,255,255,.03);color:#A0A0B0;font-size:12px;">
        © '.date('Y').' Worship Platform
      </div>
    </div>
  </body>
</html>';

    return _wp_mailer_send($toEmail, $displayName, $subject, $htmlBody, $textBody);
}

function send_registration_email(string $toEmail, string $toName, bool $showPasswordHint = false): array
{
    $displayName = trim($toName) !== '' ? $toName : 'ընկեր';

    $subject = 'Worship Platform — Դուք հաջողությամբ գրանցվել եք';

    $textBody =
"Ողջույն, {$displayName}\n\n"
."Դուք հաջողությամբ գրանցվել եք Worship Platform հարթակում։\n"
."Այժմ կարող եք մուտք գործել և օգտվել ձեր պահպանված երգերից, սեթլիստներից և անձնական կարգավորումներից։\n\n"
."Եթե այս գրանցումը դուք չեք կատարել, խնդրում ենք փոխել գաղտնաբառը կամ կապվել մեզ հետ։\n";

    if ($showPasswordHint) {
        $textBody .= "\nԵթե գրանցվել եք Google-ով և հետո ուզենաք մուտք գործել նաև գաղտնաբառով, օգտվեք «Մոռացել եմ գաղտնաբառը» տարբերակից և սահմանեք նոր գաղտնաբառ։\n";
    }

    $htmlBody = '
<!doctype html>
<html>
  <body style="margin:0;background:#05050A;padding:24px;font-family:Inter,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#12121A;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;">
      <div style="padding:18px 20px;background:linear-gradient(135deg,#9D72FF,#00F0FF);color:#fff;">
        <div style="font-weight:800;letter-spacing:.5px;font-size:16px;">WORSHIP PLATFORM</div>
        <div style="opacity:.9;font-size:13px;margin-top:6px;">Հաջող գրանցում</div>
      </div>

      <div style="padding:20px;color:#ffffff;line-height:1.55;">
        <p style="margin:0 0 12px;">Ողջույն, <b>'.htmlspecialchars($displayName, ENT_QUOTES, "UTF-8").'</b></p>
        <p style="margin:0 0 14px;">
          Դուք հաջողությամբ գրանցվել եք <b>Worship Platform</b> հարթակում։
        </p>
        <p style="margin:0 0 14px;">
          Այժմ կարող եք մուտք գործել և օգտվել ձեր պահպանված երգերից, սեթլիստներից և անձնական կարգավորումներից։
        </p>
        '.($showPasswordHint ? '
        <p style="margin:0 0 14px;color:#c7d2fe;">
          Եթե գրանցվել եք <b>Google</b>-ով և հետո ուզենաք մուտք գործել նաև գաղտնաբառով, օգտվեք <b>«Մոռացել եմ գաղտնաբառը»</b> տարբերակից և սահմանեք նոր գաղտնաբառ։
        </p>
        ' : '').'
        <p style="margin:0;color:#A0A0B0;font-size:13px;">
          Եթե այս գրանցումը դուք չեք կատարել, խորհուրդ ենք տալիս անմիջապես փոխել գաղտնաբառը։
        </p>
      </div>

      <div style="padding:14px 20px;background:rgba(255,255,255,.03);color:#A0A0B0;font-size:12px;">
        © '.date('Y').' Worship Platform
      </div>
    </div>
  </body>
</html>';

    return _wp_mailer_send($toEmail, $displayName, $subject, $htmlBody, $textBody);
}

function send_team_invite_email(string $toEmail, string $toName, string $teamName, string $inviterName): array
{
    $displayName = trim($toName) !== '' ? $toName : 'ընկեր';
    $subject = 'Worship Platform — Հրավեր Թիմ';
    
    $textBody = "Ողջույն, {$displayName}\n\n"
    ."{$inviterName}-ը հրավիրել է ձեզ միանալու «{$teamName}» թիմին Worship Platform-ում:\n"
    ."Մուտք գործեք համակարգ՝ թիմի երգացանկերն ու նյութերը տեսնելու համար։\n\n"
    ."https://worship.pmstudio.am/login\n";

    $htmlBody = '
<!doctype html>
<html>
  <body style="margin:0;background:#05050A;padding:24px;font-family:Inter,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#12121A;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;">
      <div style="padding:18px 20px;background:linear-gradient(135deg,#9D72FF,#00F0FF);color:#fff;">
        <div style="font-weight:800;letter-spacing:.5px;font-size:16px;">WORSHIP PLATFORM</div>
        <div style="opacity:.9;font-size:13px;margin-top:6px;">Նոր թիմի հրավեր</div>
      </div>
      <div style="padding:20px;color:#ffffff;line-height:1.55;">
        <p style="margin:0 0 12px;">Ողջույն, <b>'.htmlspecialchars($displayName, ENT_QUOTES, "UTF-8").'</b></p>
        <p style="margin:0 0 14px;">
          <b>'.htmlspecialchars($inviterName, ENT_QUOTES, "UTF-8").'</b>-ը հրավիրել է ձեզ միանալու <b>«'.htmlspecialchars($teamName, ENT_QUOTES, "UTF-8").'»</b> թիմին։
        </p>
        <p style="margin:18px 0;">
          <a href="https://worship.pmstudio.am/login"
             style="display:inline-block;background:linear-gradient(135deg,#9D72FF,#00F0FF);color:#05050A;
                    text-decoration:none;font-weight:800;padding:12px 16px;border-radius:12px;">
            Մուտք գործել
          </a>
        </p>
      </div>
      <div style="padding:14px 20px;background:rgba(255,255,255,.03);color:#A0A0B0;font-size:12px;">
        © '.date('Y').' Worship Platform
      </div>
    </div>
  </body>
</html>';

    return _wp_mailer_send($toEmail, $displayName, $subject, $htmlBody, $textBody);
}

function send_contact_reply_email(string $toEmail, string $toName, string $replyText, string $originalMsg): array
{
    $displayName = trim($toName) !== '' ? $toName : 'օգտատեր';
    $subject = 'Worship Platform — Պատասխան ձեր նամակին';
    
    $textBody = "Ողջույն, {$displayName}\n\n"
    ."Մենք ստացանք ձեր նամակը և ահա մեր պատասխանը:\n\n"
    ."Պատասխան:\n{$replyText}\n\n"
    ."Ձեր հաղորդագրությունը:\n{$originalMsg}\n\n"
    ."Շնորհակալություն Worship Platform-ից օգտվելու համար:\n";

    $htmlBody = '
<!doctype html>
<html>
  <body style="margin:0;background:#05050A;padding:24px;font-family:Inter,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#12121A;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;">
      <div style="padding:18px 20px;background:linear-gradient(135deg,#9D72FF,#00F0FF);color:#05050A;">
        <div style="font-weight:800;letter-spacing:.5px;font-size:16px;">WORSHIP PLATFORM</div>
        <div style="opacity:.9;font-size:13px;margin-top:6px;font-weight:600;">Պատասխան ձեր հարցմանը</div>
      </div>
      <div style="padding:20px;color:#ffffff;line-height:1.55;">
        <p style="margin:0 0 12px;">Ողջույն, <b>'.htmlspecialchars($displayName, ENT_QUOTES, "UTF-8").'</b>,</p>
        <p style="margin:0 0 14px;">Շնորհակալություն մեզ հետ կապ հաստատելու համար։ Ահա մեր պատասխանը ձեր հաղորդագրությանը.</p>
        
        <div style="background:rgba(255,255,255,.05);padding:14px;border-radius:10px;margin:18px 0;">
          <p style="margin:0;white-space:pre-wrap;">'.htmlspecialchars($replyText, ENT_QUOTES, "UTF-8").'</p>
        </div>
        
        <p style="margin:0 0 8px;font-size:12px;color:#A0A0B0;">Ձեր ուղարկած նամակը՝</p>
        <div style="background:rgba(255,255,255,.02);border-left:3px solid rgba(255,255,255,.1);padding:10px 14px;border-radius:0 10px 10px 0;font-size:13px;color:#8A8AA0;">
          <p style="margin:0;white-space:pre-wrap;font-style:italic;">'.htmlspecialchars($originalMsg, ENT_QUOTES, "UTF-8").'</p>
        </div>
      </div>
      <div style="padding:14px 20px;background:rgba(255,255,255,.03);color:#A0A0B0;font-size:12px;">
        © '.date('Y').' Worship Platform
      </div>
    </div>
  </body>
</html>';

    // To allow the user to reply to support, we add a Reply-To header. Wait, _wp_mailer_send doesn't support custom Reply-To easily without changing its signature. We'll leave it as is.
    return _wp_mailer_send($toEmail, $displayName, $subject, $htmlBody, $textBody);
}
