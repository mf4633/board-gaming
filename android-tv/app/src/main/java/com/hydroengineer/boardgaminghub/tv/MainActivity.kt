package com.hydroengineer.boardgaminghub.tv

import android.app.Activity
import android.content.Context
import android.content.pm.ApplicationInfo
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.SystemClock
import android.util.TypedValue
import android.view.Choreographer
import android.view.Gravity
import android.view.InputDevice
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.TextView
import kotlin.math.hypot

/**
 * Board Gaming Hub for Fire TV.
 *
 * The whole app is one activity hosting one WebView pointed at the live site,
 * plus the piece that actually matters: a translation layer from a five-button
 * remote to the pointer input the games were written for.
 *
 * Two input modes, because the catalogue genuinely contains two kinds of game:
 *
 *   CURSOR  D-pad drives a virtual pointer; OK synthesises a touch down/up at
 *           the pointer, so tap, drag and hover all work. This is the default
 *           and it is what the click-driven games need (Floodline, Bonneville,
 *           Chess, every board game).
 *   DPAD    Arrow keys are handed to the page untouched, for the games where
 *           the arrows ARE the controls (2048, Hellcat) and for the TV hub,
 *           whose tiles do their own spatial navigation.
 *
 * The mode is chosen per page from the URL, and the remote's menu button flips
 * it at any time — so a wrong guess costs one button press, not a broken game.
 */
class MainActivity : Activity() {

    private enum class InputMode { CURSOR, DPAD }

    private lateinit var root: FrameLayout
    private lateinit var web: WebView
    private lateinit var cursor: CursorView
    private lateinit var hud: TextView

    private var density = 1f
    private var mode = InputMode.CURSOR

    /** Direction keycodes currently held down. */
    private val held = HashSet<Int>()
    private var heldSince = 0L
    private var lastKeyEventAt = 0L
    private var frameScheduled = false

    private var pointerDown = false
    private var touchDownTime = 0L
    private var cx = 0f
    private var cy = 0f

    private val frameCallback = Choreographer.FrameCallback {
        frameScheduled = false
        stepCursor()
        if (held.isNotEmpty()) scheduleFrame()
    }

    private val hideHud = Runnable {
        hud.animate().alpha(0f).setDuration(200L).withEndAction {
            hud.visibility = View.GONE
        }.start()
    }

    // ---------------------------------------------------------------- lifecycle

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        density = resources.displayMetrics.density

        // A board game can sit untouched for minutes while somebody thinks.
        // Without this the TV blanks mid-turn.
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        root = FrameLayout(this).apply { setBackgroundColor(BG) }

        web = WebView(this).apply {
            setBackgroundColor(BG)
            isFocusable = true
            isFocusableInTouchMode = true
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true          // daily puzzles and saves live here
                loadWithOverviewMode = true
                useWideViewPort = true
                mediaPlaybackRequiresUserGesture = false
                cacheMode = WebSettings.LOAD_DEFAULT
                setSupportZoom(false)
                builtInZoomControls = false
                displayZoomControls = false
                // Lets the site tell a television apart from a phone.
                userAgentString = "$userAgentString BoardGamingHubTV/1.0"
            }
            webViewClient = HubWebViewClient()
            addJavascriptInterface(Bridge(), "BGHTV")
        }

        cursor = CursorView(this)
        hud = buildHud()

        root.addView(web, FrameLayout.LayoutParams(MATCH, MATCH))
        root.addView(cursor, FrameLayout.LayoutParams(MATCH, MATCH))
        root.addView(hud, hudLayoutParams())
        setContentView(root)

        if (isDebuggable()) {
            WebView.setWebContentsDebuggingEnabled(true)
        }

        web.loadUrl(HOME_URL)
        root.post { centreCursor() }

        if (isFirstRun()) {
            root.postDelayed({ showHud(getString(R.string.hint_first_run), 6000L) }, 2500L)
        }
    }

    override fun onResume() {
        super.onResume()
        web.onResume()
        goImmersive()
    }

    override fun onPause() {
        releaseAllInput()
        web.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        root.removeView(web)
        web.destroy()
        super.onDestroy()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) goImmersive() else releaseAllInput()
    }

    // ------------------------------------------------------------------- input

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        lastKeyEventAt = SystemClock.uptimeMillis()
        val code = event.keyCode
        val isUp = event.action == KeyEvent.ACTION_UP

        // Always-available keys, in both modes.
        when (code) {
            KeyEvent.KEYCODE_MENU,
            KeyEvent.KEYCODE_INFO,
            KeyEvent.KEYCODE_BUTTON_Y -> {
                if (isUp) toggleMode()
                return true
            }
            KeyEvent.KEYCODE_BACK -> {
                if (isUp) handleBack()
                return true
            }
            KeyEvent.KEYCODE_MEDIA_FAST_FORWARD,
            KeyEvent.KEYCODE_PAGE_DOWN -> {
                if (!isUp) web.pageDown(false)
                return true
            }
            KeyEvent.KEYCODE_MEDIA_REWIND,
            KeyEvent.KEYCODE_PAGE_UP -> {
                if (!isUp) web.pageUp(false)
                return true
            }
        }

        // In D-pad mode the page owns the arrows; hand the event straight on so
        // the WebView turns it into a real ArrowLeft/Enter keydown.
        if (mode == InputMode.DPAD) {
            return super.dispatchKeyEvent(event)
        }

        when (code) {
            KeyEvent.KEYCODE_DPAD_LEFT,
            KeyEvent.KEYCODE_DPAD_RIGHT,
            KeyEvent.KEYCODE_DPAD_UP,
            KeyEvent.KEYCODE_DPAD_DOWN -> {
                handleDirection(code, event.action)
                return true
            }
            KeyEvent.KEYCODE_DPAD_CENTER,
            KeyEvent.KEYCODE_ENTER,
            KeyEvent.KEYCODE_NUMPAD_ENTER,
            KeyEvent.KEYCODE_BUTTON_A -> {
                handleSelect(event)
                return true
            }
        }

        return super.dispatchKeyEvent(event)
    }

    private fun handleDirection(code: Int, action: Int) {
        when (action) {
            KeyEvent.ACTION_DOWN -> {
                if (held.isEmpty()) heldSince = SystemClock.uptimeMillis()
                held.add(code)
                scheduleFrame()
            }
            KeyEvent.ACTION_UP -> held.remove(code)
        }
    }

    private fun handleSelect(event: KeyEvent) {
        if (event.action == KeyEvent.ACTION_DOWN) {
            // repeatCount guards against auto-repeat turning one press into a
            // stream of touch-downs with no matching up.
            if (event.repeatCount == 0 && !pointerDown) {
                pointerDown = true
                cursor.isPointerDown = true
                sendTouch(MotionEvent.ACTION_DOWN)
            }
        } else if (event.action == KeyEvent.ACTION_UP && pointerDown) {
            pointerDown = false
            cursor.isPointerDown = false
            sendTouch(MotionEvent.ACTION_UP)
        }
    }

    // ------------------------------------------------------------ cursor motion

    private fun scheduleFrame() {
        if (frameScheduled) return
        frameScheduled = true
        Choreographer.getInstance().postFrameCallback(frameCallback)
    }

    private fun stepCursor() {
        if (held.isEmpty()) return

        // Watchdog. A remote that drops an ACTION_UP would otherwise leave the
        // pointer sprinting off-screen forever with no way back. Auto-repeat
        // refreshes lastKeyEventAt roughly every 50ms while a key is genuinely
        // held, so this only fires on a real lost release.
        val now = SystemClock.uptimeMillis()
        if (now - lastKeyEventAt > KEY_WATCHDOG_MS) {
            held.clear()
            return
        }

        var dx = 0f
        var dy = 0f
        if (held.contains(KeyEvent.KEYCODE_DPAD_LEFT)) dx -= 1f
        if (held.contains(KeyEvent.KEYCODE_DPAD_RIGHT)) dx += 1f
        if (held.contains(KeyEvent.KEYCODE_DPAD_UP)) dy -= 1f
        if (held.contains(KeyEvent.KEYCODE_DPAD_DOWN)) dy += 1f
        if (dx == 0f && dy == 0f) return

        // Normalise so a diagonal isn't 41% faster than a straight line.
        val len = hypot(dx.toDouble(), dy.toDouble()).toFloat()
        dx /= len
        dy /= len

        // Quadratic ramp: precise for a short tap, fast across a 1080p screen
        // once held. Linear felt sluggish at the start and twitchy at the end.
        val t = ((now - heldSince).toFloat() / RAMP_MS).coerceIn(0f, 1f)
        val speed = (SPEED_MIN_DP + (SPEED_MAX_DP - SPEED_MIN_DP) * t * t) * density

        val w = root.width.toFloat()
        val h = root.height.toFloat()
        if (w <= 0f || h <= 0f) return

        cx = (cx + dx * speed).coerceIn(0f, w - 1f)
        cy = (cy + dy * speed).coerceIn(0f, h - 1f)

        // Pages are taller than the screen, so pushing the pointer into an edge
        // scrolls rather than just stopping.
        val margin = EDGE_MARGIN_DP * density
        val scrollStep = speed.toInt().coerceAtLeast(1)
        if (dy < 0f && cy <= margin) web.scrollBy(0, -scrollStep)
        if (dy > 0f && cy >= h - margin) web.scrollBy(0, scrollStep)
        if (dx < 0f && cx <= margin) web.scrollBy(-scrollStep, 0)
        if (dx > 0f && cx >= w - margin) web.scrollBy(scrollStep, 0)

        cursor.moveTo(cx, cy)

        // While OK is held this is a drag, so keep the gesture alive with moves
        // instead of hovers; otherwise report a hover so games that draw a
        // preview under the pointer (Floodline's cursor layer) still get it.
        if (pointerDown) sendTouch(MotionEvent.ACTION_MOVE) else sendHover()
    }

    private fun centreCursor() {
        val w = root.width
        val h = root.height
        if (w <= 0 || h <= 0) return
        cx = w / 2f
        cy = h * 0.55f
        cursor.moveTo(cx, cy)
    }

    // ------------------------------------------------------- synthesised events

    /**
     * Taps and drags go in as a touchscreen gesture rather than a mouse one.
     * These games already ship as phone apps, so the touch path is the proven
     * one: WebView turns it into touchstart/pointerdown/mousedown/click, which
     * covers every listener style in the catalogue.
     */
    private fun sendTouch(action: Int) {
        val now = SystemClock.uptimeMillis()
        if (action == MotionEvent.ACTION_DOWN) touchDownTime = now

        val props = arrayOf(MotionEvent.PointerProperties().apply {
            id = 0
            toolType = MotionEvent.TOOL_TYPE_FINGER
        })
        val coords = arrayOf(MotionEvent.PointerCoords().apply {
            x = cx
            y = cy
            pressure = 1f
            size = 1f
        })

        val event = MotionEvent.obtain(
            touchDownTime, now, action, 1, props, coords,
            0, 0, 1f, 1f, 0, 0, InputDevice.SOURCE_TOUCHSCREEN, 0
        )
        web.dispatchTouchEvent(event)
        event.recycle()
    }

    /**
     * Hover is sent from a mouse source because that is the only way a WebView
     * emits mousemove without a button held. Purely additive: a page that
     * ignores hover loses nothing.
     */
    private fun sendHover() {
        val now = SystemClock.uptimeMillis()
        val props = arrayOf(MotionEvent.PointerProperties().apply {
            id = 0
            toolType = MotionEvent.TOOL_TYPE_MOUSE
        })
        val coords = arrayOf(MotionEvent.PointerCoords().apply {
            x = cx
            y = cy
            pressure = 0f
            size = 0f
        })

        val event = MotionEvent.obtain(
            now, now, MotionEvent.ACTION_HOVER_MOVE, 1, props, coords,
            0, 0, 1f, 1f, 0, 0, InputDevice.SOURCE_MOUSE, 0
        )
        web.dispatchGenericMotionEvent(event)
        event.recycle()
    }

    private fun releaseAllInput() {
        held.clear()
        if (pointerDown) {
            pointerDown = false
            cursor.isPointerDown = false
            sendTouch(MotionEvent.ACTION_CANCEL)
        }
    }

    // -------------------------------------------------------------------- modes

    private fun toggleMode() {
        setMode(if (mode == InputMode.CURSOR) InputMode.DPAD else InputMode.CURSOR, announce = true)
    }

    private fun setMode(next: InputMode, announce: Boolean) {
        releaseAllInput()
        mode = next
        cursor.visibility = if (next == InputMode.CURSOR) View.VISIBLE else View.GONE
        if (next == InputMode.DPAD) web.requestFocus()
        if (announce) {
            showHud(getString(if (next == InputMode.CURSOR) R.string.mode_cursor else R.string.mode_dpad))
        }
    }

    /**
     * Per-page mode. `?tvinput=dpad` is written by the TV hub when it links to a
     * game whose controls are the arrows; the /tv path itself is always D-pad
     * because its tiles run their own spatial navigation. Everything else gets
     * the pointer.
     */
    private fun modeForUrl(url: String?): InputMode {
        if (url.isNullOrBlank()) return InputMode.CURSOR
        val uri = try { Uri.parse(url) } catch (e: Exception) { return InputMode.CURSOR }

        val hint = try { uri.getQueryParameter("tvinput") } catch (e: UnsupportedOperationException) { null }
        if (hint != null) return if (hint.equals("dpad", ignoreCase = true)) InputMode.DPAD else InputMode.CURSOR

        val path = uri.path ?: ""
        return if (path == "/tv" || path == "/tv.html" || path.startsWith("/tv/")) InputMode.DPAD else InputMode.CURSOR
    }

    private fun handleBack() {
        val path = try { Uri.parse(web.url ?: "").path ?: "" } catch (e: Exception) { "" }
        val atHub = path == "/tv" || path == "/tv.html" || path == "/tv/"
        when {
            atHub -> finish()
            web.canGoBack() -> web.goBack()
            else -> web.loadUrl(HOME_URL)
        }
    }

    // ------------------------------------------------------------------ webview

    private inner class HubWebViewClient : WebViewClient() {

        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
            interceptNavigation(request.url?.toString())

        // Kept for Fire OS 5 devices, which predate the WebResourceRequest overload.
        @Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")
        override fun shouldOverrideUrlLoading(view: WebView, url: String?): Boolean =
            interceptNavigation(url)

        override fun onPageFinished(view: WebView, url: String?) {
            setMode(modeForUrl(url), announce = false)
            centreCursor()
        }

        override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
            if (request.isForMainFrame) showOffline()
        }

        // Same: the request/error overload below only arrives from API 23 up.
        @Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")
        override fun onReceivedError(view: WebView, errorCode: Int, description: String?, failingUrl: String?) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M && failingUrl != null && failingUrl == view.url) {
                showOffline()
            }
        }
    }

    /**
     * A television has nowhere sensible to send an off-site link — there may be
     * no browser installed at all — so off-site navigation is swallowed and
     * explained rather than crashing into an activity-not-found.
     */
    private fun interceptNavigation(url: String?): Boolean {
        if (url == null) return false
        val host = try { Uri.parse(url).host } catch (e: Exception) { null } ?: return false
        if (host == SITE_HOST || host.endsWith(".$SITE_HOST")) return false
        showHud(getString(R.string.external_blocked))
        return true
    }

    private fun showOffline() {
        val html = """
            <!doctype html>
            <meta charset="utf-8">
            <meta name="viewport" content="width=1280,initial-scale=1">
            <style>
              html,body{margin:0;height:100%;background:#0c1016;color:#d8d0c0;
                font-family:Georgia,serif;display:flex;align-items:center;justify-content:center}
              .box{text-align:center;padding:0 8vw;max-width:900px}
              h1{color:#f0d89c;font-size:44px;letter-spacing:8px;margin:0 0 20px}
              p{font-size:24px;line-height:1.6;color:#a8b0c0;margin:0 0 34px}
              button{font:inherit;font-size:26px;letter-spacing:4px;color:#0c1016;background:#f0d89c;
                border:0;border-radius:6px;padding:16px 44px;cursor:pointer}
              button:focus,button:hover{outline:none;box-shadow:0 0 0 5px rgba(240,216,156,.35)}
            </style>
            <div class="box">
              <h1>${getString(R.string.offline_title)}</h1>
              <p>${getString(R.string.offline_body)}</p>
              <button autofocus onclick="window.BGHTV&&window.BGHTV.reload()">${getString(R.string.offline_retry)}</button>
            </div>
        """.trimIndent()
        web.loadDataWithBaseURL(null, html, "text/html", "utf-8", null)
    }

    private inner class Bridge {
        /** Lets a page ask for a mode explicitly; the TV hub calls this on load. */
        @JavascriptInterface
        fun setInputMode(requested: String?) {
            runOnUiThread {
                setMode(
                    if (requested.equals("dpad", ignoreCase = true)) InputMode.DPAD else InputMode.CURSOR,
                    announce = false
                )
            }
        }

        @JavascriptInterface
        fun reload() {
            runOnUiThread { web.loadUrl(HOME_URL) }
        }
    }

    // --------------------------------------------------------------------- chrome

    private fun buildHud(): TextView {
        val pad = (18 * density).toInt()
        return TextView(this).apply {
            setTextColor(GOLD)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
            gravity = Gravity.CENTER
            setPadding(pad, (pad * 0.6f).toInt(), pad, (pad * 0.6f).toInt())
            background = GradientDrawable().apply {
                cornerRadius = 8 * density
                setColor(0xE6141C28.toInt())
                setStroke((1.5f * density).toInt(), 0xFF2A3540.toInt())
            }
            visibility = View.GONE
        }
    }

    private fun hudLayoutParams(): FrameLayout.LayoutParams =
        FrameLayout.LayoutParams(WRAP, WRAP).apply {
            gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
            // Sits above the overscan band so a real television doesn't eat it.
            bottomMargin = (48 * density).toInt()
        }

    private fun showHud(text: String, durationMs: Long = 2600L) {
        hud.removeCallbacks(hideHud)
        hud.text = text
        hud.alpha = 1f
        hud.visibility = View.VISIBLE
        hud.postDelayed(hideHud, durationMs)
    }

    @Suppress("DEPRECATION")
    private fun goImmersive() {
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            )
    }

    private fun isDebuggable(): Boolean =
        (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0

    private fun isFirstRun(): Boolean {
        val prefs = getSharedPreferences("bghtv", Context.MODE_PRIVATE)
        if (!prefs.getBoolean("seen_hint", false)) {
            prefs.edit().putBoolean("seen_hint", true).apply()
            return true
        }
        return false
    }

    private companion object {
        const val HOME_URL = "https://boardgaminghub.com/tv"
        const val SITE_HOST = "boardgaminghub.com"

        // Pointer feel, in dp per frame at 60Hz. Tuned for 1080p: a tap nudges
        // a few pixels, a held direction crosses the screen in about a second.
        const val SPEED_MIN_DP = 3.5f
        const val SPEED_MAX_DP = 22f
        const val RAMP_MS = 550f
        const val EDGE_MARGIN_DP = 56f
        const val KEY_WATCHDOG_MS = 900L

        // Not `const`: a colour written as 0xAARRGGBB is a Long literal needing
        // .toInt(), and a Java static is not a Kotlin compile-time constant.
        val BG = 0xFF0C1016.toInt()
        val GOLD = 0xFFF0D89C.toInt()
        val MATCH = ViewGroup.LayoutParams.MATCH_PARENT
        val WRAP = ViewGroup.LayoutParams.WRAP_CONTENT
    }
}
