import UIKit
import Capacitor
import WebKit
import AVFoundation

class AppBridgeViewController: CAPBridgeViewController, WKScriptMessageHandler {
    private var textInteractionHandlerInstalled = false
    private var runtimeHandlerInstalled = false
    private var audioSessionHandlerInstalled = false
    private var lastRuntimeHeartbeat = Date()
    private var runtimeWatchdog: Timer?
    private var lastAutomaticReload = Date.distantPast
    private var runtimeHealthCheckInFlight = false
    private var consecutiveRuntimeHealthCheckFailures = 0
    private var callAudioActive = false
    private var callUsesSpeaker = false

    override func viewDidLoad() {
        super.viewDidLoad()
        configureScrollView()
    }

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        configureScrollView()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        configureScrollView()
    }

    private func configureScrollView() {
        let darkBg = UIColor(red: 5.0/255.0, green: 5.0/255.0, blue: 10.0/255.0, alpha: 1.0)
        view.backgroundColor = darkBg
        if let wv = webView {
            if !textInteractionHandlerInstalled {
                wv.configuration.userContentController.add(self, name: "nativeTextInteraction")
                textInteractionHandlerInstalled = true
            }
            if !runtimeHandlerInstalled {
                wv.configuration.userContentController.add(self, name: "nativeRuntime")
                runtimeHandlerInstalled = true
                startRuntimeWatchdog()
            }
            if !audioSessionHandlerInstalled {
                wv.configuration.userContentController.add(self, name: "nativeAudioSession")
                audioSessionHandlerInstalled = true
                NotificationCenter.default.addObserver(
                    self,
                    selector: #selector(handleAudioSessionInterruption(_:)),
                    name: AVAudioSession.interruptionNotification,
                    object: AVAudioSession.sharedInstance()
                )
            }
            wv.isOpaque = false
            wv.backgroundColor = darkBg
            wv.scrollView.backgroundColor = darkBg
            wv.scrollView.decelerationRate = .normal
            // Pull-to-refresh is rendered by the app. Native rubber-band
            // overscroll can expose the dark WKWebView host as a black screen.
            wv.scrollView.bounces = false
            wv.scrollView.alwaysBounceVertical = false
            wv.scrollView.showsVerticalScrollIndicator = false
            wv.scrollView.showsHorizontalScrollIndicator = false
            // Restore the native iOS left-edge interactive back gesture.
            // This is intentionally enabled only in the packaged WKWebView;
            // the PWA keeps its own navigation policy.
            wv.allowsBackForwardNavigationGestures = true
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "nativeRuntime" {
            lastRuntimeHeartbeat = Date()
            return
        }

        if message.name == "nativeAudioSession", let command = message.body as? String {
            updateCallAudioSession(command: command)
            return
        }

        guard message.name == "nativeTextInteraction",
              let enabled = message.body as? Bool else { return }
        guard let webView else { return }
        setSystemLongPressEnabled(enabled, in: webView)
    }

    private func updateCallAudioSession(command: String) {
        let session = AVAudioSession.sharedInstance()
        do {
            switch command {
            case "start":
                callAudioActive = true
                try session.setCategory(
                    .playAndRecord,
                    mode: .voiceChat,
                    options: [.allowBluetoothHFP]
                )
                try session.setActive(true)
                enforceCallAudioRoute()
                scheduleCallAudioRouteEnforcement()
            case "speaker":
                callUsesSpeaker = true
                enforceCallAudioRoute()
                scheduleCallAudioRouteEnforcement()
            case "earpiece":
                callUsesSpeaker = false
                enforceCallAudioRoute()
                scheduleCallAudioRouteEnforcement()
            case "stop":
                callAudioActive = false
                callUsesSpeaker = false
                try session.overrideOutputAudioPort(.none)
                try session.setActive(false, options: .notifyOthersOnDeactivation)
            default:
                break
            }
        } catch {
            print("Native call audio session error: \(error.localizedDescription)")
        }
    }

    private func enforceCallAudioRoute() {
        guard callAudioActive else { return }
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setActive(true)
            try session.overrideOutputAudioPort(callUsesSpeaker ? .speaker : .none)
        } catch {
            print("Native call route error: \(error.localizedDescription)")
        }
    }

    private func scheduleCallAudioRouteEnforcement() {
        // WKWebView's WebRTC audio unit can reset the output shortly after
        // getUserMedia/ontrack. Re-apply the user's route after it settles.
        for delay in [0.15, 0.6, 1.2] {
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
                self?.enforceCallAudioRoute()
            }
        }
    }

    @objc private func handleAudioSessionInterruption(_ notification: Notification) {
        guard callAudioActive,
              let rawType = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? NSNumber,
              let type = AVAudioSession.InterruptionType(rawValue: rawType.uintValue),
              type == .ended else { return }

        DispatchQueue.main.async { [weak self] in
            guard let self, self.callAudioActive else { return }
            self.updateCallAudioSession(command: "start")
        }
    }

    private func setSystemLongPressEnabled(_ enabled: Bool, in view: UIView) {
        view.gestureRecognizers?
            .compactMap { $0 as? UILongPressGestureRecognizer }
            .forEach { $0.isEnabled = enabled }
        view.subviews.forEach { setSystemLongPressEnabled(enabled, in: $0) }
    }

    private func startRuntimeWatchdog() {
        runtimeWatchdog?.invalidate()
        runtimeWatchdog = Timer.scheduledTimer(withTimeInterval: 8, repeats: true) { [weak self] _ in
            guard let self else { return }
            guard UIApplication.shared.applicationState == .active else {
                self.lastRuntimeHeartbeat = Date()
                self.consecutiveRuntimeHealthCheckFailures = 0
                return
            }
            // JavaScript timers may legitimately be delayed while the chat is
            // busy with scrolling, the keyboard, media or WebRTC. A missing
            // heartbeat alone must never reload a healthy WKWebView: doing so
            // was the source of the intermittent black chat screen.
            guard Date().timeIntervalSince(self.lastRuntimeHeartbeat) > 40 else { return }
            self.checkRuntimeHealth()
        }
    }

    private func checkRuntimeHealth() {
        guard !runtimeHealthCheckInFlight, let webView else { return }
        runtimeHealthCheckInFlight = true

        let healthProbe = """
        (() => {
          const root = document.getElementById('root');
          const healthy = Boolean(root && root.childElementCount > 0);
          if (healthy) {
            document.documentElement.style.removeProperty('opacity');
            document.body.style.removeProperty('opacity');
            document.body.style.removeProperty('pointer-events');
            window.dispatchEvent(new CustomEvent('wp-native-resume'));
          }
          return healthy;
        })()
        """

        webView.evaluateJavaScript(healthProbe) { [weak self] result, error in
            guard let self else { return }
            self.runtimeHealthCheckInFlight = false

            if error == nil, (result as? Bool) == true {
                self.lastRuntimeHeartbeat = Date()
                self.consecutiveRuntimeHealthCheckFailures = 0
                return
            }

            self.consecutiveRuntimeHealthCheckFailures += 1
            guard self.consecutiveRuntimeHealthCheckFailures >= 3 else { return }
            guard Date().timeIntervalSince(self.lastAutomaticReload) > 120 else { return }

            // Reload only after the DOM has failed several direct probes. This
            // keeps genuine WebContent crashes recoverable without interrupting
            // a responsive chat merely because its timer was throttled.
            self.lastAutomaticReload = Date()
            self.lastRuntimeHeartbeat = Date()
            self.consecutiveRuntimeHealthCheckFailures = 0
            webView.reload()
        }
    }

    deinit {
        runtimeWatchdog?.invalidate()
        NotificationCenter.default.removeObserver(self)
        if textInteractionHandlerInstalled {
            webView?.configuration.userContentController.removeScriptMessageHandler(forName: "nativeTextInteraction")
        }
        if runtimeHandlerInstalled {
            webView?.configuration.userContentController.removeScriptMessageHandler(forName: "nativeRuntime")
        }
        if audioSessionHandlerInstalled {
            webView?.configuration.userContentController.removeScriptMessageHandler(forName: "nativeAudioSession")
        }
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private var privacyView: UIView?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        let darkBg = UIColor(red: 5.0/255.0, green: 5.0/255.0, blue: 10.0/255.0, alpha: 1.0)
        window = UIWindow(windowScene: windowScene)
        window?.backgroundColor = darkBg
        window?.rootViewController = AppBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }

    func sceneWillResignActive(_ scene: UIScene) {
        // Face ID, Control Center, and other system overlays temporarily make
        // the scene inactive while it is still visible. Do not cover the app
        // here, otherwise the biometric confirmation page flashes to black.
    }

    func sceneDidEnterBackground(_ scene: UIScene) {
        guard let window, privacyView == nil else { return }
        let cover = UIView(frame: window.bounds)
        cover.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        cover.backgroundColor = UIColor(red: 5.0/255.0, green: 5.0/255.0, blue: 10.0/255.0, alpha: 1.0)

        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.text = "Worship Platform"
        label.textColor = .white
        label.font = .systemFont(ofSize: 22, weight: .semibold)
        cover.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: cover.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: cover.centerYAnchor),
        ])

        window.addSubview(cover)
        privacyView = cover
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        removePrivacyCover()
    }

    func sceneWillEnterForeground(_ scene: UIScene) {
        // Remove the cover as early as possible. This is a second safeguard for
        // interrupted transitions (Face ID, calls and app switching).
        removePrivacyCover()
    }

    private func removePrivacyCover() {
        privacyView?.removeFromSuperview()
        privacyView = nil
    }
}
