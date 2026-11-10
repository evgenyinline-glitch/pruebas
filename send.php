<?php
/**
 * Приём заявки с сайта «Созидание» и отправка её на sales@sozidanie.company.
 *
 * Форма (index.html #form) отправляет POST на этот файл через fetch + FormData
 * и ждёт JSON-ответ. Без JavaScript форма уходит обычным POST-запросом,
 * после чего посетитель возвращается на страницу с якорем #contacts.
 *
 * Требует PHP 7.4+ и настроенную на хостинге отправку почты (mail()/sendmail).
 */
declare(strict_types=1);

const MAIL_TO       = 'sales@sozidanie.company';
const MAIL_FROM     = 'no-reply@sozidanie.company';
const MAIL_SUBJECT  = 'Заявка с сайта sozidanie.company';
const SITE_HOST     = 'sozidanie.company';

mb_internal_encoding('UTF-8');

$isAjax = isset($_SERVER['HTTP_ACCEPT'])
    && stripos((string) $_SERVER['HTTP_ACCEPT'], 'application/json') !== false;

/**
 * Единый ответ: JSON для fetch-запроса, редирект для обычной отправки формы.
 */
function respond(bool $ok, string $message, bool $isAjax): void
{
    if ($isAjax) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code($ok ? 200 : 422);
        echo json_encode(['ok' => $ok, 'message' => $message], JSON_UNESCAPED_UNICODE);
    } else {
        $flag = $ok ? '1' : '0';
        header('Location: index.html?sent=' . $flag . '#contacts', true, 303);
    }
    exit;
}

/**
 * Чистим пользовательский ввод: убираем переводы строк (защита от инъекции
 * в заголовки письма), теги, лишние пробелы и обрезаем по длине.
 */
function field(string $key, int $max): string
{
    $value = (string) ($_POST[$key] ?? '');
    $value = str_replace(["\r", "\n", "%0a", "%0d"], ' ', $value);
    $value = strip_tags($value);
    $value = preg_replace('/\s+/u', ' ', $value) ?? '';
    return mb_substr(trim($value), 0, $max);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST', true, 405);
    respond(false, 'Метод не поддерживается.', $isAjax);
}

/* Ловушка для ботов: поле скрыто стилями. Боту отвечаем «успехом», письмо не шлём. */
if (trim((string) ($_POST['company'] ?? '')) !== '') {
    respond(true, 'Спасибо. Заявка отправлена.', $isAjax);
}

$name  = field('name', 120);
$phone = field('phone', 40);
$task  = field('task', 1000);

if (mb_strlen($name) < 2) {
    respond(false, 'Пожалуйста, укажите имя.', $isAjax);
}

$digits = (string) preg_replace('/\D+/', '', $phone);
if (strlen($digits) < 10) {
    respond(false, 'Пожалуйста, укажите номер телефона.', $isAjax);
}

$subject = MAIL_SUBJECT . ' — ' . $name;

$body = implode("\n", [
    'Новая заявка с сайта ' . SITE_HOST,
    str_repeat('-', 40),
    'Имя:       ' . $name,
    'Телефон:   ' . $phone,
    'Задача:    ' . ($task !== '' ? $task : '—'),
    str_repeat('-', 40),
    'Страница:  ' . (($_SERVER['HTTP_REFERER'] ?? '') !== '' ? $_SERVER['HTTP_REFERER'] : 'index.html'),
    'IP:        ' . ($_SERVER['REMOTE_ADDR'] ?? '—'),
    'Дата:      ' . date('d.m.Y H:i:s'),
    '',
]);

$headers = implode("\r\n", [
    'From: Созидание <' . MAIL_FROM . '>',
    'Reply-To: ' . MAIL_FROM,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: PHP/' . phpversion(),
]);

$subjectEncoded = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$sent = @mail(MAIL_TO, $subjectEncoded, $body, $headers, '-f' . MAIL_FROM);

if (!$sent) {
    respond(false, 'Не удалось отправить письмо. Попробуйте позже или позвоните нам.', $isAjax);
}

respond(true, 'Спасибо. Заявка отправлена — мы свяжемся с вами в течение рабочего дня.', $isAjax);
