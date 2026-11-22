# Worship Platform Android R8 / ProGuard Rules

# Preserve WebView JavascriptInterface bridges
-keepattributes *Annotation*
-keepclassmembers class am.pmstudio.worship.MainActivity$* {
    @android.webkit.JavascriptInterface <methods>;
    public *;
}
-keep class am.pmstudio.worship.MainActivity { *; }

# Keep Capacitor core & all Capacitor plugins (loaded via reflection)
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.** { *; }
-keep class com.aparajita.** { *; }
-keep class org.apache.cordova.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod <methods>;
}

# Keep FirebaseApp and Firebase Messaging for runtime push delivery & reflection check
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**
-keep class am.pmstudio.worship.WorshipFirebaseMessagingService { *; }
-keep class am.pmstudio.worship.ChatNotificationActionReceiver { *; }

# Preserve line numbers for readable crash traces
-keepattributes SourceFile,LineNumberTable
