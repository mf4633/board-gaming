package com.hydroengineer.boardgaminghub.tv

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.view.View

/**
 * The virtual pointer the D-pad drives, drawn above the WebView.
 *
 * It is deliberately a native overlay rather than an injected DOM element: the
 * games own their document and several of them paint full-screen canvases, so
 * anything injected would end up underneath artwork or wiped by a re-render.
 *
 * Contrast is the whole design. A game page can be near-white (Sudoku) or
 * near-black (Apoapsis), so the pointer is a light disc inside a dark ring with
 * a fake drop shadow underneath — readable either way, from three metres.
 */
class CursorView(context: Context) : View(context) {

    private val density = resources.displayMetrics.density

    private val shadow = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = 0x66000000
    }
    private val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
    }
    private val ring = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 2.5f * density
        color = 0xCC0C1016.toInt()
    }
    private val core = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = 0xFF0C1016.toInt()
    }

    private var cx = 0f
    private var cy = 0f

    /** True while OK is held, which is also how a drag is expressed. */
    var isPointerDown: Boolean = false
        set(value) {
            if (field != value) {
                field = value
                invalidate()
            }
        }

    init {
        // Purely decorative: never intercept input, never take focus.
        isClickable = false
        isFocusable = false
        setWillNotDraw(false)
    }

    fun moveTo(x: Float, y: Float) {
        if (x == cx && y == cy) return
        cx = x
        cy = y
        invalidate()
    }

    fun position(): FloatArray = floatArrayOf(cx, cy)

    override fun onDraw(canvas: Canvas) {
        // A pressed pointer shrinks and turns gold, so a click reads as a click
        // even when the page underneath gives no feedback.
        val radius = (if (isPointerDown) 9f else 12f) * density
        fill.color = if (isPointerDown) 0xFFF0D89C.toInt() else 0xFFF4F0E6.toInt()

        canvas.drawCircle(cx + 1.5f * density, cy + 2.5f * density, radius, shadow)
        canvas.drawCircle(cx, cy, radius, fill)
        canvas.drawCircle(cx, cy, radius, ring)
        canvas.drawCircle(cx, cy, 2f * density, core)
    }
}
