﻿import { View, PageBase, actionBarHiddenProperty, enableSwipeBackNavigationProperty, Color } from "./page-common";
import { ActionBar } from "ui/action-bar";
import { GridLayout } from "ui/layouts/grid-layout";
import { DIALOG_FRAGMENT_TAG } from "./constants";
import * as trace from "trace";

export * from "./page-common";

interface DialogFragmentClass {
    new (owner: Page, fullscreen: boolean, shownCallback: () => void, dismissCallback: () => void): android.app.DialogFragment;
}
var DialogFragmentClass: DialogFragmentClass;

function ensureDialogFragmentClass() {
    if (DialogFragmentClass) {
        return;
    }

    class DialogFragmentClassInner extends android.app.DialogFragment {
        constructor(
            private _owner: Page,
            private _fullscreen: boolean,
            private _shownCallback: () => void,
            private _dismissCallback: () => void) {
            super();
            return global.__native(this);
        }

        public onCreateDialog(savedInstanceState: android.os.Bundle): android.app.Dialog {
            var dialog = new android.app.Dialog(this._owner._context);
            dialog.requestWindowFeature(android.view.Window.FEATURE_NO_TITLE);

            // Hide actionBar and adjust alignment based on _fullscreen value.
            this._owner.horizontalAlignment = this._fullscreen ? "stretch" : "center";
            this._owner.verticalAlignment = this._fullscreen ? "stretch" : "center";
            this._owner.actionBarHidden = true;

            dialog.setContentView(this._owner._nativeView, this._owner._nativeView.getLayoutParams());

            var window = dialog.getWindow();
            window.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT));

            if (this._fullscreen) {
                window.setLayout(android.view.ViewGroup.LayoutParams.FILL_PARENT, android.view.ViewGroup.LayoutParams.FILL_PARENT);
            }

            return dialog;
        }

        public onStart() {
            super.onStart();
            if (!this._owner.isLoaded) {
                this._owner.onLoaded();
            }
            this._shownCallback();
        }

        public onDestroyView() {
            super.onDestroyView();

            if (this._owner.isLoaded) {
                this._owner.onUnloaded();
            }

            this._owner._isAddedToNativeVisualTree = false;
            this._owner._onDetached(true);

        }

        public onDismiss(dialog: android.content.IDialogInterface) {
            super.onDismiss(dialog);
            this._dismissCallback();
        }

    };

    DialogFragmentClass = DialogFragmentClassInner;
}

export class Page extends PageBase {
    private _isBackNavigation = false;
    private _grid: org.nativescript.widgets.GridLayout;

    get android(): android.view.ViewGroup {
        return this._grid;
    }

    get _nativeView(): android.view.ViewGroup {
        return this._grid;
    }

    public _createUI() {
        this._grid = new org.nativescript.widgets.GridLayout(this._context);
        this._grid.addRow(new org.nativescript.widgets.ItemSpec(1, org.nativescript.widgets.GridUnitType.auto));
        this._grid.addRow(new org.nativescript.widgets.ItemSpec(1, org.nativescript.widgets.GridUnitType.star));
    }

    public _addViewToNativeVisualTree(child: View, atIndex?: number): boolean {
        // Set the row property for the child 
        if (this._nativeView && child._nativeView) {
            if (child instanceof ActionBar) {
                GridLayout.setRow(child, 0);
                child.horizontalAlignment = "stretch";
                child.verticalAlignment = "top";
            }
            else {
                GridLayout.setRow(child, 1);
            }
        }

        return super._addViewToNativeVisualTree(child, atIndex);
    }

    public onLoaded() {
        super.onLoaded();
        if (this.actionBarHidden !== undefined) {
            this.updateActionBar(this.actionBarHidden);
        }
    }

    public _onDetached(force?: boolean) {
        var skipDetached = !force && this.frame.android.cachePagesOnNavigate && !this._isBackNavigation;

        if (skipDetached) {
            // Do not detach the context and android reference.
            if (trace.enabled) {
                trace.write(`Caching ${this}`, trace.categories.NativeLifecycle);
            }
        }
        else {
            super._onDetached();
        }
    }

    public onNavigatedFrom(isBackNavigation: boolean) {
        this._isBackNavigation = isBackNavigation;
        super.onNavigatedFrom(isBackNavigation);
    }

    /* tslint:disable */
    private _dialogFragment: android.app.DialogFragment;
    /* tslint:enable */
    protected _showNativeModalView(parent: Page, context: any, closeCallback: Function, fullscreen?: boolean) {
        super._showNativeModalView(parent, context, closeCallback, fullscreen);
        if (!this.backgroundColor) {
            this.backgroundColor = new Color("White");
        }

        this._onAttached(parent._context);
        this._isAddedToNativeVisualTree = true;

        ensureDialogFragmentClass();

        this._dialogFragment = new DialogFragmentClass(this, !!fullscreen, () => this._raiseShownModallyEvent(), () => this.closeModal());

        super._raiseShowingModallyEvent();

        this._dialogFragment.show(parent.frame.android.activity.getFragmentManager(), DIALOG_FRAGMENT_TAG);
    }

    protected _hideNativeModalView(parent: Page) {
        this._dialogFragment.dismissAllowingStateLoss();
        this._dialogFragment = null;

        parent._modal = undefined;

        super._hideNativeModalView(parent);
    }

    private updateActionBar(hidden: boolean) {
        this.actionBar.update();
    }

    get [actionBarHiddenProperty.native](): boolean {
        return undefined;
    }
    set [actionBarHiddenProperty.native](value: boolean) {
        this.updateActionBar(value);
    }
}