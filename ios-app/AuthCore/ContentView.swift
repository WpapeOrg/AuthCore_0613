import SwiftUI
import UIKit
import WebKit

func serverURL() -> String {
    return "http://192.168.1.102:3000"
}

struct WebView: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.defaultWebpagePreferences.allowsContentJavaScript = true

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.backgroundColor = UIColor(red: 0.08, green: 0.08, blue: 0.10, alpha: 1.0)
        webView.scrollView.backgroundColor = UIColor(red: 0.08, green: 0.08, blue: 0.10, alpha: 1.0)
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true

        let request = URLRequest(url: url, cachePolicy: .useProtocolCachePolicy, timeoutInterval: 10)
        webView.load(request)
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            print("WebView load error: \(error.localizedDescription)")
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            let nsError = error as NSError
            if nsError.domain == NSURLErrorDomain && nsError.code == -1004 {
                showErrorPage(webView, message: "无法连接到服务器\n请确保 Mac 已启动 node server.js")
            }
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "saveImage", let body = message.body as? [String: String],
               let urlString = body["url"] {
                guard let url = URL(string: urlString) else { return }
                URLSession.shared.dataTask(with: url) { data, _, error in
                    guard let data = data, let image = UIImage(data: data) else { return }
                    DispatchQueue.main.async {
                        UIImageWriteToSavedPhotosAlbum(image, nil, nil, nil)
                    }
                }.resume()
            }
        }

        func showErrorPage(_ webView: WKWebView, message: String) {
            let html = """
            <html><head><meta name="viewport" content="width=device-width,initial-scale=1">
            <style>body{background:#14141a;color:#aaa;display:flex;align-items:center;justify-content:center;
            height:100vh;margin:0;font-family:-apple-system,sans-serif;text-align:center;line-height:1.8}
            </style></head><body><div>\(message)</div></body></html>
            """
            webView.loadHTMLString(html, baseURL: nil)
        }
    }
}

struct ContentView: View {
    @State private var isLoading = true

    var body: some View {
        ZStack {
            WebView(url: URL(string: serverURL())!)

            if isLoading {
                VStack(spacing: 16) {
                    ProgressView()
                        .scaleEffect(1.2)
                        .tint(.gray)
                    Text("加载中...")
                        .foregroundColor(.gray)
                        .font(.caption)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color(red: 0.08, green: 0.08, blue: 0.10))
                .onAppear {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                        isLoading = false
                    }
                }
            }
        }
        .ignoresSafeArea()
        .preferredColorScheme(.dark)
    }
}
