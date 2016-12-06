import { View } from "./background-common";
import { isNullOrUndefined, isFunction, getClass } from "utils/types";
import { CacheLayerType } from "utils/utils";
import { Button } from "ui/button";
import cssValue = require("css-value");

export * from "./background-common"

// We are using "ad" here to avoid namespace collision with the global android object
export module ad {
    let SDK: number;
    function getSDK() {
        if (!SDK) {
            SDK = android.os.Build.VERSION.SDK_INT;
        }

        return SDK;
    }

    let _defaultBackgrounds = new Map<string, android.graphics.drawable.Drawable>();

    export function onBackgroundOrBorderPropertyChanged(v: View) {
        let nativeView = <android.view.View>v._nativeView;
        if (!nativeView) {
            return;
        }
        let style = v.style;

        let background = style.backgroundInternal;
        let backgroundDrawable = nativeView.getBackground();
        let cache = <CacheLayerType>v._nativeView;
        if (v instanceof Button
            && !isNullOrUndefined(backgroundDrawable)
            && isFunction(backgroundDrawable.setColorFilter)
            && !background.hasBorderWidth()
            && !background.hasBorderRadius()
            && !background.clipPath
            && isNullOrUndefined(background.image)
            && !isNullOrUndefined(background.color)) {
            let backgroundColor = (<any>backgroundDrawable).backgroundColor = background.color.android;
            backgroundDrawable.setColorFilter(backgroundColor, android.graphics.PorterDuff.Mode.SRC_IN);
            (<any>backgroundDrawable).backgroundColor = backgroundColor;
        }
        else if (!background.isEmpty()) {
            if (!(backgroundDrawable instanceof org.nativescript.widgets.BorderDrawable)) {
                let viewClass = getClass(v);
                if (!(v instanceof Button) && !_defaultBackgrounds.has(viewClass)) {
                    _defaultBackgrounds.set(viewClass, nativeView.getBackground());
                }

                backgroundDrawable = new org.nativescript.widgets.BorderDrawable();
                refreshBorderDrawable(v, <org.nativescript.widgets.BorderDrawable>backgroundDrawable);
                nativeView.setBackground(backgroundDrawable);
            }
            else {
                refreshBorderDrawable(v, <org.nativescript.widgets.BorderDrawable>backgroundDrawable);
            }

            if ((background.hasBorderWidth() || background.hasBorderRadius() || background.clipPath) && getSDK() < 18) {
                // Switch to software because of unsupported canvas methods if hardware acceleration is on:
                // http://developer.android.com/guide/topics/graphics/hardware-accel.html
                cache.layerType = cache.getLayerType();
                cache.setLayerType(android.view.View.LAYER_TYPE_SOFTWARE, null);
            }
        }
        else {
            // reset the value with the default native value
            if (v instanceof Button) {
                let nativeButton = new android.widget.Button(nativeView.getContext());
                nativeView.setBackground(nativeButton.getBackground());
            }
            else {
                let viewClass = getClass(v);
                if (_defaultBackgrounds.has(viewClass)) {
                    nativeView.setBackground(_defaultBackgrounds.get(viewClass));
                }
            }

            if (cache.layerType !== undefined) {
                cache.setLayerType(cache.layerType, null);
                cache.layerType = undefined;
            }
        }

        // TODO: Can we move BorderWidths as separate native setter?
        // This way we could skip setPadding if borderWidth is not changed.
        let leftPadding = Math.round(style.effectiveBorderLeftWidth + style.effectivePaddingLeft);
        let topPadding = Math.round(style.effectiveBorderTopWidth + style.effectivePaddingTop);
        let rightPadding = Math.round(style.effectiveBorderRightWidth + style.effectivePaddingRight);
        let bottomPadding = Math.round(style.effectiveBorderBottomWidth + style.effectivePaddingBottom);

        nativeView.setPadding(
            leftPadding,
            topPadding,
            rightPadding,
            bottomPadding
        );
    }
}

function refreshBorderDrawable(view: View, borderDrawable: org.nativescript.widgets.BorderDrawable) {
    let background = view.style.backgroundInternal;
    if (background) {
        let backgroundPositionParsedCSSValues: native.Array<org.nativescript.widgets.CSSValue> = null;
        let backgroundSizeParsedCSSValues: native.Array<org.nativescript.widgets.CSSValue> = null;
        if (background.position) {
            backgroundPositionParsedCSSValues = createNativeCSSValueArray(background.position);
        }
        if (background.size) {
            backgroundSizeParsedCSSValues = createNativeCSSValueArray(background.size);
        }

        borderDrawable.refresh(
            (background.borderTopColor && background.borderTopColor.android) ? background.borderTopColor.android : 0,
            (background.borderRightColor && background.borderRightColor.android) ? background.borderRightColor.android : 0,
            (background.borderBottomColor && background.borderBottomColor.android) ? background.borderBottomColor.android : 0,
            (background.borderLeftColor && background.borderLeftColor.android) ? background.borderLeftColor.android : 0,

            background.borderTopWidth,
            background.borderRightWidth,
            background.borderBottomWidth,
            background.borderLeftWidth,

            background.borderTopLeftRadius,
            background.borderTopRightRadius,
            background.borderBottomRightRadius,
            background.borderBottomLeftRadius,

            background.clipPath,

            (background.color && background.color.android) ? background.color.android : 0,
            (background.image && background.image.android) ? background.image.android : null,
            background.repeat,
            background.position,
            backgroundPositionParsedCSSValues,
            background.size,
            backgroundSizeParsedCSSValues
        );
    }
}

function createNativeCSSValueArray(css: string): native.Array<org.nativescript.widgets.CSSValue> {
    if (!css) {
        return null;
    }

    let cssValues = cssValue(css);
    let nativeArray = Array.create(org.nativescript.widgets.CSSValue, cssValues.length);
    for (let i = 0, length = cssValues.length; i < length; i++) {
        nativeArray[i] = new org.nativescript.widgets.CSSValue(
            cssValues[i].type,
            cssValues[i].string,
            cssValues[i].unit,
            cssValues[i].value
        );
    }

    return nativeArray;
}