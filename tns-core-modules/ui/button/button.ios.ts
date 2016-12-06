﻿import { ControlStateChangeListener } from "ui/core/control-state-change";
import {
    View, ButtonBase, PseudoClassHandler, textProperty, formattedTextProperty, whiteSpaceProperty,
    borderTopWidthProperty, borderRightWidthProperty, borderBottomWidthProperty, borderLeftWidthProperty,
    paddingTopProperty, paddingRightProperty, paddingBottomProperty, paddingLeftProperty, Length
} from "./button-common";

export * from "./button-common";

export class Button extends ButtonBase {
    public nativeView: UIButton;

    private _tapHandler: NSObject;
    private _stateChangedHandler: ControlStateChangeListener;

    constructor() {
        super();
        this.nativeView = UIButton.buttonWithType(UIButtonType.System);

        this._tapHandler = TapHandlerImpl.initWithOwner(new WeakRef(this));
        this.nativeView.addTargetActionForControlEvents(this._tapHandler, "tap", UIControlEvents.TouchUpInside);
    }

    public onUnloaded() {
        super.onUnloaded();
        if (this._stateChangedHandler) {
            this._stateChangedHandler.stop();
        }
    }

    @PseudoClassHandler("normal", "highlighted")
    _updateHandler(subscribe: boolean) {
        if (subscribe) {
            if (!this._stateChangedHandler) {
                this._stateChangedHandler = new ControlStateChangeListener(this.nativeView, (s: string) => {
                    this._goToVisualState(s);
                });
            }
            this._stateChangedHandler.start();
        } else {
            this._stateChangedHandler.stop();
        }
    }

    get [whiteSpaceProperty.native](): "normal" | "nowrap" {
        return "normal";
    }
    set [whiteSpaceProperty.native](value: "normal" | "nowrap") {
        let nativeView = this.nativeView.titleLabel;
        if (value === "normal") {
            nativeView.lineBreakMode = NSLineBreakMode.ByWordWrapping;
            nativeView.numberOfLines = 0;
        }
        else {
            nativeView.lineBreakMode = NSLineBreakMode.ByTruncatingTail;
            nativeView.numberOfLines = 1;
        }
    }

    get [borderTopWidthProperty.native](): Length {
        return {
            value: this.nativeView.contentEdgeInsets.top,
            unit: "px"
        };
    }
    set [borderTopWidthProperty.native](value: Length) {
        let inset = this.nativeView.contentEdgeInsets;
        let style = this.style;
        let top = style.effectivePaddingTop + style.effectiveBorderTopWidth;
        this.nativeView.contentEdgeInsets = { top: top, left: inset.left, bottom: inset.bottom, right: inset.right };
    }

    get [borderRightWidthProperty.native](): Length {
        return {
            value: this.nativeView.contentEdgeInsets.right,
            unit: "px"
        };
    }
    set [borderRightWidthProperty.native](value: Length) {
        let inset = this.nativeView.contentEdgeInsets;
        let style = this.style;
        let right = style.effectivePaddingRight + style.effectiveBorderRightWidth;
        this.nativeView.contentEdgeInsets = { top: inset.top, left: inset.left, bottom: inset.bottom, right: right };
    }

    get [borderBottomWidthProperty.native](): Length {
        return {
            value: this.nativeView.contentEdgeInsets.bottom,
            unit: "px"
        };
    }
    set [borderBottomWidthProperty.native](value: Length) {
        let inset = this.nativeView.contentEdgeInsets;
        let style = this.style;
        let bottom = style.effectivePaddingBottom + style.effectiveBorderBottomWidth;
        this.nativeView.contentEdgeInsets = { top: inset.top, left: inset.left, bottom: bottom, right: inset.right };
    }

    get [borderLeftWidthProperty.native](): Length {
        return {
            value: this.nativeView.contentEdgeInsets.left,
            unit: "px"
        };
    }
    set [borderLeftWidthProperty.native](value: Length) {
        let inset = this.nativeView.contentEdgeInsets;
        let style = this.style;
        let left = style.effectivePaddingLeft + style.effectiveBorderLeftWidth;
        this.nativeView.contentEdgeInsets = { top: inset.top, left: left, bottom: inset.bottom, right: inset.right };
    }

    get [paddingTopProperty.native](): Length {
        return {
            value: this.nativeView.contentEdgeInsets.top,
            unit: "px"
        };
    }
    set [paddingTopProperty.native](value: Length) {
        let inset = this.nativeView.contentEdgeInsets;
        let style = this.style;
        let top = style.effectivePaddingTop + style.effectiveBorderTopWidth;
        this.nativeView.contentEdgeInsets = { top: top, left: inset.left, bottom: inset.bottom, right: inset.right };
    }

    get [paddingRightProperty.native](): Length {
        return {
            value: this.nativeView.contentEdgeInsets.right,
            unit: "px"
        };
    }
    set [paddingRightProperty.native](value: Length) {
        let inset = this.nativeView.contentEdgeInsets;
        let style = this.style;
        let right = style.effectivePaddingRight + style.effectiveBorderRightWidth;
        this.nativeView.contentEdgeInsets = { top: inset.top, left: inset.left, bottom: inset.bottom, right: right };
    }

    get [paddingBottomProperty.native](): Length {
        return {
            value: this.nativeView.contentEdgeInsets.bottom,
            unit: "px"
        };
    }
    set [paddingBottomProperty.native](value: Length) {
        let inset = this.nativeView.contentEdgeInsets;
        let style = this.style;
        let bottom = style.effectivePaddingBottom + style.effectiveBorderBottomWidth;
        this.nativeView.contentEdgeInsets = { top: inset.top, left: inset.left, bottom: bottom, right: inset.right };
    }

    get [paddingLeftProperty.native](): Length {
        return {
            value: this.nativeView.contentEdgeInsets.left,
            unit: "px"
        };
    }
    set [paddingLeftProperty.native](value: Length) {
        let inset = this.nativeView.contentEdgeInsets;
        let style = this.style;
        let left = style.effectivePaddingLeft + style.effectiveBorderLeftWidth;
        this.nativeView.contentEdgeInsets = { top: inset.top, left: left, bottom: inset.bottom, right: inset.right };
    }
}

class TapHandlerImpl extends NSObject {
    private _owner: WeakRef<Button>;

    public static initWithOwner(owner: WeakRef<Button>): TapHandlerImpl {
        let handler = <TapHandlerImpl>TapHandlerImpl.new();
        handler._owner = owner;
        return handler;
    }

    public tap(args) {
        let owner = this._owner.get();
        if (owner) {
            owner._emit(ButtonBase.tapEvent);
        }
    }

    public static ObjCExposedMethods = {
        "tap": { returns: interop.types.void, params: [interop.types.id] }
    };
}