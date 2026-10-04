import UIKit
import Capacitor

class AppBridgeViewController: CAPBridgeViewController {
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
            wv.isOpaque = false
            wv.backgroundColor = darkBg
            wv.scrollView.backgroundColor = darkBg
            wv.scrollView.decelerationRate = .normal
            wv.scrollView.bounces = true
            wv.scrollView.alwaysBounceVertical = true
            wv.scrollView.showsVerticalScrollIndicator = false
            wv.scrollView.showsHorizontalScrollIndicator = false
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
