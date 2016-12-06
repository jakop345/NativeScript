﻿import {
    EditableTextBase as EditableTextBaseCommon, keyboardTypeProperty,
    returnKeyTypeProperty, editableProperty, updateTextTriggerProperty,
    autocapitalizationTypeProperty, autocorrectProperty, hintProperty, 
    textProperty
} from "./editable-text-base-common";

import { ad } from "utils/utils";

export * from "./editable-text-base-common";


@Interfaces([android.text.TextWatcher])
class TextWatcher implements android.text.TextWatcher {
    constructor(private owner: WeakRef<EditableTextBase>) {
        return global.__native(this);
    }

    public beforeTextChanged(text: string, start: number, count: number, after: number) {
        //
    }

    public onTextChanged(text: string, start: number, before: number, count: number) {
        let owner = this.owner.get();
        if (!owner) {
            return;
        }
        let selectionStart = owner.android.getSelectionStart();
        owner.android.removeTextChangedListener(owner._textWatcher);

        // //RemoveThisDoubleCall
        // owner.style._updateTextDecoration();
        // owner.style._updateTextTransform();

        owner.android.addTextChangedListener(owner._textWatcher);
        owner.android.setSelection(selectionStart);
    }

    public afterTextChanged(editable: android.text.IEditable) {
        let owner = this.owner.get();
        if (!owner) {
            return;
        }

        switch (owner.updateTextTrigger) {
            case "focusLost":
                owner._dirtyTextAccumulator = editable.toString();
                break;
            case "textChanged":
                owner.nativePropertyChanged(textProperty, editable.toString());
                break;
            default:
                throw new Error("Invalid updateTextTrigger: " + owner.updateTextTrigger);
        }
    }
}

@Interfaces([android.view.View.OnFocusChangeListener])
class FocusChangeListener implements android.view.View.OnFocusChangeListener {
    constructor(private owner: WeakRef<EditableTextBase>) {
        return global.__native(this);
    }

    public onFocusChange(view: android.view.View, hasFocus: boolean) {
        let owner = this.owner.get();
        if (!owner) {
            return;
        }

        if (!hasFocus) {
            if (owner._dirtyTextAccumulator) {
                owner.nativePropertyChanged(textProperty, owner._dirtyTextAccumulator);
                owner._dirtyTextAccumulator = undefined;
            }

            owner.dismissSoftInput();
        }
    }
}

@Interfaces([android.widget.TextView.OnEditorActionListener])
class EditorActionListener implements android.widget.TextView.OnEditorActionListener {
    constructor(private owner: WeakRef<EditableTextBase>) {
        return global.__native(this);
    }

    public onEditorAction(textView: android.widget.TextView, actionId: number, event: android.view.KeyEvent): boolean {
        let owner = this.owner.get();
        if (owner && (actionId === android.view.inputmethod.EditorInfo.IME_ACTION_DONE ||
            actionId === android.view.inputmethod.EditorInfo.IME_ACTION_GO ||
            actionId === android.view.inputmethod.EditorInfo.IME_ACTION_SEARCH ||
            actionId === android.view.inputmethod.EditorInfo.IME_ACTION_SEND ||
            actionId === android.view.inputmethod.EditorInfo.IME_ACTION_NEXT ||
            (event && event.getKeyCode() === android.view.KeyEvent.KEYCODE_ENTER))) {
            owner.dismissSoftInput();
            owner._onReturnPress();
        }

        return false;
    }
}

export abstract class EditableTextBase extends EditableTextBaseCommon {
    _textWatcher: android.text.TextWatcher;
    /* tslint:disable */
    _dirtyTextAccumulator: string;
    /* tslint:enable */

    private _android: android.widget.EditText;
    private _keyListenerCache: android.text.method.KeyListener;
    private _focusChangeListener: android.view.View.OnFocusChangeListener;
    private _editorActionListener: android.widget.TextView.OnEditorActionListener;
    public nativeView: android.widget.EditText;

    get android(): android.widget.EditText {
        return this._android;
    }

    public abstract _configureEditText(): void;

    public abstract _onReturnPress(): void;

    public _createUI() {
        this._android = new android.widget.EditText(this._context);
        this._configureEditText();
        this._keyListenerCache = this.android.getKeyListener();

        let weakRef = new WeakRef(this);

        this._textWatcher = this._textWatcher || new TextWatcher(weakRef);
        this._android.addTextChangedListener(this._textWatcher);

        this._focusChangeListener = this._focusChangeListener || new FocusChangeListener(weakRef);
        this._android.setOnFocusChangeListener(this._focusChangeListener);

        this._editorActionListener = this._editorActionListener || new EditorActionListener(weakRef);
        this._android.setOnEditorActionListener(this._editorActionListener);
    }

    public _onDetached(force?: boolean) {
        if (this._android) {
            if (this._textWatcher) {
                this._android.removeTextChangedListener(this._textWatcher);
            }

            if (this._focusChangeListener) {
                this._android.setOnFocusChangeListener(null);
            }

            if (this._editorActionListener) {
                this._android.setOnEditorActionListener(null);
            }
        }

        this._android = undefined;
        super._onDetached(force);
    }

    public dismissSoftInput() {
        ad.dismissSoftInput(this._nativeView);
    }

    public focus(): boolean {
        let result = super.focus();

        if (result) {
            ad.showSoftInput(this._nativeView);
        }

        return result;
    }

    private _setInputType(inputType): void {
        let nativeView = this.nativeView;
        nativeView.setInputType(inputType);

        // setInputType will change the keyListener so we should cache it again
        let listener = nativeView.getKeyListener();
        if (listener) {
            this._keyListenerCache = listener;
        }

        // clear the listener if editable is false
        if (!this.editable) {
            nativeView.setKeyListener(null);
        }
    }

    get [textProperty.native](): string {
        return this.nativeView.getText();
    }
    set [textProperty.native](value: string) {
        let newValue = value + '';
        this.nativeView.setText(newValue, android.widget.TextView.BufferType.EDITABLE);
    }

    get [keyboardTypeProperty.native](): "datetime" | "phone" | "number" | "url" | "email" | string {
        let inputType = this.nativeView.getInputType();
        switch (inputType) {
            case android.text.InputType.TYPE_CLASS_DATETIME | android.text.InputType.TYPE_DATETIME_VARIATION_NORMAL:
                return "datetime";

            case android.text.InputType.TYPE_CLASS_PHONE:
                return "phone";

            case android.text.InputType.TYPE_CLASS_NUMBER | android.text.InputType.TYPE_NUMBER_VARIATION_NORMAL | android.text.InputType.TYPE_NUMBER_FLAG_SIGNED | android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL:
                return "number";

            case android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_URI:
                return "url";

            case android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS:
                return "email";

            default:
                return inputType.toString();
        }
    }
    set [keyboardTypeProperty.native](value: "datetime" | "phone" | "number" | "url" | "email" | string) {
        let newInputType;
        switch (value) {
            case "datetime":
                newInputType = android.text.InputType.TYPE_CLASS_DATETIME | android.text.InputType.TYPE_DATETIME_VARIATION_NORMAL;
                break;

            case "phone":
                newInputType = android.text.InputType.TYPE_CLASS_PHONE;
                break;

            case "number":
                newInputType = android.text.InputType.TYPE_CLASS_NUMBER | android.text.InputType.TYPE_NUMBER_VARIATION_NORMAL | android.text.InputType.TYPE_NUMBER_FLAG_SIGNED | android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL;
                break;

            case "url":
                newInputType = android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_URI;
                break;

            case "email":
                newInputType = android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS;
                break;

            default:
                let inputType = +value;
                if (!isNaN(inputType)) {
                    newInputType = inputType;
                } else {
                    newInputType = android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_NORMAL;
                }
                break;
        }

        this._setInputType(newInputType);
    }

    get [returnKeyTypeProperty.native](): "done" | "next" | "go" | "search" | "send" | string {
        let ime = this.nativeView.getImeOptions();
        switch (ime) {
            case android.view.inputmethod.EditorInfo.IME_ACTION_DONE:
                return "done";

            case android.view.inputmethod.EditorInfo.IME_ACTION_GO:
                return "go";

            case android.view.inputmethod.EditorInfo.IME_ACTION_NEXT:
                return "next";

            case android.view.inputmethod.EditorInfo.IME_ACTION_SEARCH:
                return "search";

            case android.view.inputmethod.EditorInfo.IME_ACTION_SEND:
                return "send";

            default:
                return ime.toString();
        }
    }
    set [returnKeyTypeProperty.native](value: "done" | "next" | "go" | "search" | "send" | string) {
        let newImeOptions;
        switch (value) {
            case "done":
                newImeOptions = android.view.inputmethod.EditorInfo.IME_ACTION_DONE;
                break;
            case "go":
                newImeOptions = android.view.inputmethod.EditorInfo.IME_ACTION_GO;
                break;
            case "next":
                newImeOptions = android.view.inputmethod.EditorInfo.IME_ACTION_NEXT;
                break;
            case "search":
                newImeOptions = android.view.inputmethod.EditorInfo.IME_ACTION_SEARCH;
                break;
            case "send":
                newImeOptions = android.view.inputmethod.EditorInfo.IME_ACTION_SEND;
                break;
            default:
                let ime = +value;
                if (!isNaN(ime)) {
                    newImeOptions = ime;
                } else {
                    newImeOptions = android.view.inputmethod.EditorInfo.IME_ACTION_UNSPECIFIED;
                }
                break;
        }

        this._android.setImeOptions(newImeOptions);
    }

    get [editableProperty.native](): boolean {
        return !!this.nativeView.getKeyListener();
    }
    set [editableProperty.native](value: boolean) {
        if (value) {
            this.nativeView.setKeyListener(this._keyListenerCache);
        }
        else {
            this.nativeView.setKeyListener(null);
        }
    }

    get [autocapitalizationTypeProperty.native](): "none" | "words" | "sentences" | "allCharacters" | string {
        let inputType = this.nativeView.getInputType();
        if ((inputType & android.text.InputType.TYPE_TEXT_FLAG_CAP_WORDS) === android.text.InputType.TYPE_TEXT_FLAG_CAP_WORDS) {
            return "words";
        } else if ((inputType & android.text.InputType.TYPE_TEXT_FLAG_CAP_SENTENCES) === android.text.InputType.TYPE_TEXT_FLAG_CAP_SENTENCES) {
            return "sentences";
        } else if ((inputType & android.text.InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS) === android.text.InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS) {
            return "allCharacters";
        } else {
            return inputType.toString();
        }
    }
    set [autocapitalizationTypeProperty.native](value: string) {
        let inputType = this.nativeView.getInputType();
        inputType = inputType & ~28672; //28672 (0x00070000) 13,14,15bits (111 0000 0000 0000)

        switch (value) {
            case "none":
                //Do nothing, we have lowered the three bits above.
                break;
            case "words":
                inputType = inputType | android.text.InputType.TYPE_TEXT_FLAG_CAP_WORDS; //8192 (0x00020000) 14th bit
                break;
            case "sentences":
                inputType = inputType | android.text.InputType.TYPE_TEXT_FLAG_CAP_SENTENCES; //16384(0x00040000) 15th bit
                break;
            case "allCharacters":
                inputType = inputType | android.text.InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS; //4096 (0x00010000) 13th bit
                break;
            default:
                let number = +value;
                // We set the default value.
                if (!isNaN(number)) {
                    inputType = number;
                } else {
                    inputType = inputType | android.text.InputType.TYPE_TEXT_FLAG_CAP_SENTENCES;
                }
                break;
        }

        this._setInputType(inputType);
    }

    get [autocorrectProperty.native](): boolean {
        let autocorrect = this.nativeView.getInputType();
        if ((autocorrect & android.text.InputType.TYPE_TEXT_FLAG_AUTO_CORRECT) === android.text.InputType.TYPE_TEXT_FLAG_AUTO_CORRECT) {
            return true;
        }

        return false;
    }
    set [autocorrectProperty.native](value: boolean) {
        let inputType = this.nativeView.getInputType();
        switch (value) {
            case true:
                inputType = inputType | android.text.InputType.TYPE_TEXT_FLAG_AUTO_COMPLETE;
                inputType = inputType | android.text.InputType.TYPE_TEXT_FLAG_AUTO_CORRECT;
                inputType = inputType & ~android.text.InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS;
                break;
            case false:
                inputType = inputType & ~android.text.InputType.TYPE_TEXT_FLAG_AUTO_COMPLETE;
                inputType = inputType & ~android.text.InputType.TYPE_TEXT_FLAG_AUTO_CORRECT;
                inputType = inputType | android.text.InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS;
                break;
            default:
                // We can't do anything.
                break;
        }

        this._setInputType(inputType);
    }

    get [hintProperty.native](): string {
        return this.nativeView.getHint();
    }
    set [hintProperty.native](value: string) {
        this.nativeView.setHint(value + '');
    }
}