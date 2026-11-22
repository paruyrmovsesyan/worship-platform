package am.pmstudio.worship;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.RemoteInput;
import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class WorshipFirebaseMessagingService extends FirebaseMessagingService {

    public static final String ACTION_REPLY = "am.pmstudio.worship.ACTION_REPLY";
    public static final String ACTION_MARK_READ = "am.pmstudio.worship.ACTION_MARK_READ";
    public static final String KEY_TEXT_REPLY = "key_text_reply";

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        Map<String, String> data = remoteMessage.getData();
        String actionChatId = data.get("action_chat_id");
        String actionSig = data.get("action_sig");
        String targetUserId = data.get("target_user_id");

        // If this is a chat push with action metadata, build an interactive notification with Reply & Mark Read
        if (actionChatId != null && !actionChatId.isEmpty() && actionSig != null && targetUserId != null) {
            showInteractiveChatNotification(remoteMessage, data, actionChatId, targetUserId, actionSig);
        }

        // Forward to Capacitor plugin for web listener handling
        PushNotificationsPlugin.sendRemoteMessage(remoteMessage);
    }

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        PushNotificationsPlugin.onNewToken(token);
    }

    private void showInteractiveChatNotification(
        RemoteMessage remoteMessage,
        Map<String, String> data,
        String chatId,
        String userId,
        String sig
    ) {
        Context context = getApplicationContext();
        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager == null) return;

        String channelId = "worship-chat";
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = notificationManager.getNotificationChannel(channelId);
            if (channel == null) {
                channel = new NotificationChannel(channelId, "Չատ և Զանգեր", NotificationManager.IMPORTANCE_HIGH);
                channel.setDescription("Անձնական նամակներ, խմբային չատ և զանգերի ծանուցումներ");
                channel.enableLights(true);
                channel.setLightColor(Color.parseColor("#9D72FF"));
                channel.enableVibration(true);
                notificationManager.createNotificationChannel(channel);
            }
        }

        int notificationId = 10000 + (int)(Math.abs(chatId.hashCode()) % 50000);

        String title = "Worship Platform";
        String body = "";
        if (remoteMessage.getNotification() != null) {
            if (remoteMessage.getNotification().getTitle() != null) title = remoteMessage.getNotification().getTitle();
            if (remoteMessage.getNotification().getBody() != null) body = remoteMessage.getNotification().getBody();
        } else {
            if (data.containsKey("title")) title = data.get("title");
            if (data.containsKey("body")) body = data.get("body");
        }

        // Tap content intent -> opens the specific chat
        Intent openIntent = new Intent(context, MainActivity.class);
        openIntent.setAction(Intent.ACTION_VIEW);
        openIntent.setData(Uri.parse("https://worship.pmstudio.am/chat/" + chatId));
        openIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentPendingIntent = PendingIntent.getActivity(
            context,
            notificationId,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // 1. "Mark as Read" action
        Intent markReadIntent = new Intent(context, ChatNotificationActionReceiver.class);
        markReadIntent.setAction(ACTION_MARK_READ);
        markReadIntent.putExtra("chat_id", chatId);
        markReadIntent.putExtra("user_id", userId);
        markReadIntent.putExtra("sig", sig);
        markReadIntent.putExtra("ts", data.get("action_ts"));
        markReadIntent.putExtra("notification_id", notificationId);
        PendingIntent markReadPendingIntent = PendingIntent.getBroadcast(
            context,
            notificationId + 1,
            markReadIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? PendingIntent.FLAG_MUTABLE : 0)
        );
        NotificationCompat.Action markReadAction = new NotificationCompat.Action.Builder(
            R.drawable.ic_stat_notification,
            "Նշել կարդացված",
            markReadPendingIntent
        ).build();

        // 2. "Reply" action with Direct RemoteInput
        RemoteInput remoteInput = new RemoteInput.Builder(KEY_TEXT_REPLY)
            .setLabel("Գրեք պատասխանը...")
            .build();

        Intent replyIntent = new Intent(context, ChatNotificationActionReceiver.class);
        replyIntent.setAction(ACTION_REPLY);
        replyIntent.putExtra("chat_id", chatId);
        replyIntent.putExtra("user_id", userId);
        replyIntent.putExtra("sig", sig);
        replyIntent.putExtra("ts", data.get("action_ts"));
        replyIntent.putExtra("notification_id", notificationId);
        replyIntent.putExtra("sender_title", title);

        PendingIntent replyPendingIntent = PendingIntent.getBroadcast(
            context,
            notificationId + 2,
            replyIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? PendingIntent.FLAG_MUTABLE : 0)
        );
        NotificationCompat.Action replyAction = new NotificationCompat.Action.Builder(
            R.drawable.ic_stat_notification,
            "Պատասխանել",
            replyPendingIntent
        ).addRemoteInput(remoteInput)
         .setAllowGeneratedReplies(true)
         .build();

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.drawable.ic_stat_notification)
            .setColor(Color.parseColor("#9D72FF"))
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(contentPendingIntent)
            .addAction(replyAction)
            .addAction(markReadAction)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE);

        notificationManager.notify(notificationId, builder.build());
    }
}
