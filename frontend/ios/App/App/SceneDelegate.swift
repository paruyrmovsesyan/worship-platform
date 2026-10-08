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
                try session.setCategory(
                    .playAndRecord,
                    mode: .voiceChat,
                    options: [.allowBluetoothHFP]
                )
                try session.setActive(true)
                try session.overrideOutputAudioPort(.none)
            case "speaker":
                try session.overrideOutputAudioPort(.speaker)
            case "earpiece":
                try session.overrideOutputAudioPort(.none)
            case "stop":
                try session.overrideOutputAudioPort(.none)
                try session.setActive(false, options: .notifyOthersOnDeactivation)
            default:
                break
            }
        } catch {
            print("Native call audio session error: \(error.localizedDescription)")
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
                return
            }
            guard Date().timeIntervalSince(self.lastRuntimeHeartbeat) > 24 else { return }
            guard Date().timeIntervalSince(self.lastAutomaticReload) > 60 else { return }

            self.lastAutomaticReload = Date()
            self.lastRuntimeHeartbeat = Date()
            self.webView?.reload()
        }
    }

    deinit {
        runtimeWatchdog?.invalidate()
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
        privacyView?.removeFromSuperview()
        privacyView = nil
    }
}
