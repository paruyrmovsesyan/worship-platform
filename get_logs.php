<?php
if(file_exists('error_log')){
    echo nl2br(htmlspecialchars(shell_exec('tail -n 50 error_log')));
} else {
    echo "No error_log found.";
}
