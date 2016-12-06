﻿import { Page as PageDefinition, NavigatedData, ShownModallyData } from "ui/page";
import {
    ContentView, EventData, View, Template, KeyedTemplate, Length, backgroundColorProperty,
    eachDescendant, Property, Color, isIOS, booleanConverter
} from "ui/content-view";
import { Frame, topmost as topmostFrame, resolvePageFromEntry } from "ui/frame";
import { ActionBar } from "ui/action-bar";
import { KeyframeAnimationInfo } from "ui/animation/keyframe-animation";
import { StyleScope } from "../styling/style-scope";
import { File, path, knownFolders } from "file-system";

export * from "ui/content-view";

export class PageBase extends ContentView implements PageDefinition {

    public static navigatingToEvent = "navigatingTo";
    public static navigatedToEvent = "navigatedTo";
    public static navigatingFromEvent = "navigatingFrom";
    public static navigatedFromEvent = "navigatedFrom";
    public static shownModallyEvent = "shownModally";
    public static showingModallyEvent = "showingModally";

    protected _closeModalCallback: Function;
    private _modalContext: any;

    private _navigationContext: any;

    private _cssApplied: boolean;
    private _styleScope = new StyleScope();
    private _actionBar: ActionBar;

    public _modal: PageBase;
    public _fragmentTag: string;

    public actionBarHidden: boolean;
    public enableSwipeBackNavigation: boolean;
    public backgroundSpanUnderStatusBar: boolean;

    constructor() {
        super();
        this.actionBar = new ActionBar();

        // The default style of the page should be white background
        this.style[backgroundColorProperty.cssName] = new Color("white");
    }

    public onLoaded() {
        this._applyCss();
        super.onLoaded();
    }


    get navigationContext(): any {
        return this._navigationContext;
    }

    get css(): string {
        if (this._styleScope) {
            return this._styleScope.css;
        }
        return undefined;
    }
    set css(value: string) {
        this._styleScope.css = value;
        this._refreshCss();
    }

    get actionBar(): ActionBar {
        return this._actionBar;
    }
    set actionBar(value: ActionBar) {
        if (!value) {
            throw new Error("ActionBar cannot be null or undefined.");
        }

        if (this._actionBar !== value) {
            if (this._actionBar) {
                this._actionBar.page = undefined;
                this._removeView(this._actionBar);
            }
            this._actionBar = value;
            this._actionBar.page = this;
            this._addView(this._actionBar);
        }
    }

    get page(): View {
        return this;
    }

    private _refreshCss(): void {
        if (this._cssApplied) {
            this._resetCssValues();
        }

        this._cssApplied = false;
        if (this.isLoaded) {
            this._applyCss();
        }
    }

    public addCss(cssString: string): void {
        this._addCssInternal(cssString, undefined);
    }

    private _addCssInternal(cssString: string, cssFileName: string): void {
        this._styleScope.addCss(cssString, cssFileName);
        this._refreshCss();
    }

    private _cssFiles = {};
    public addCssFile(cssFileName: string) {
        if (cssFileName.indexOf("~/") === 0) {
            cssFileName = path.join(knownFolders.currentApp().path, cssFileName.replace("~/", ""));
        }
        if (!this._cssFiles[cssFileName]) {
            if (File.exists(cssFileName)) {
                const file = File.fromPath(cssFileName);
                const text = file.readTextSync();
                if (text) {
                    this._addCssInternal(text, cssFileName);
                    this._cssFiles[cssFileName] = true;
                }
            }
        }
    }

    public getKeyframeAnimationWithName(animationName: string): KeyframeAnimationInfo {
        return this._styleScope.getKeyframeAnimationWithName(animationName);
    }

    get frame(): Frame {
        return <Frame>this.parent;
    }

    private createNavigatedData(eventName: string, isBackNavigation: boolean): NavigatedData {
        return {
            eventName: eventName,
            object: this,
            context: this.navigationContext,
            isBackNavigation: isBackNavigation
        };
    }

    public onNavigatingTo(context: any, isBackNavigation: boolean, bindingContext?: any) {
        this._navigationContext = context;

        //https://github.com/NativeScript/NativeScript/issues/731
        if (!isBackNavigation && bindingContext !== undefined && bindingContext !== null) {
            this.bindingContext = bindingContext;
        }
        this.notify(this.createNavigatedData(PageBase.navigatingToEvent, isBackNavigation));
    }

    public onNavigatedTo(isBackNavigation: boolean) {
        this.notify(this.createNavigatedData(PageBase.navigatedToEvent, isBackNavigation));
    }

    public onNavigatingFrom(isBackNavigation: boolean) {
        this.notify(this.createNavigatedData(PageBase.navigatingFromEvent, isBackNavigation));
    }

    public onNavigatedFrom(isBackNavigation: boolean) {
        this.notify(this.createNavigatedData(PageBase.navigatedFromEvent, isBackNavigation));

        this._navigationContext = undefined;
    }

    public showModal(): PageBase {
        if (arguments.length === 0) {
            this._showNativeModalView(<any>topmostFrame().currentPage, undefined, undefined, true);
            return this;
        } else {
            const context: any = arguments[1];
            const closeCallback: Function = arguments[2];
            const fullscreen: boolean = arguments[3];

            let page: PageBase;
            if (arguments[0] instanceof PageBase) {
                page = arguments[0];
            } else {
                page = <PageBase>resolvePageFromEntry({ moduleName: arguments[0] });
            }

            page._showNativeModalView(this, context, closeCallback, fullscreen);
            return page;
        }
    }

    public closeModal() {
        if (this._closeModalCallback) {
            this._closeModalCallback.apply(undefined, arguments);
        }
    }

    public get modal(): PageBase {
        return this._modal;
    }

    public _addChildFromBuilder(name: string, value: any) {
        if (value instanceof ActionBar) {
            this.actionBar = value;
        }
        else {
            super._addChildFromBuilder(name, value);
        }
    }

    protected _showNativeModalView(parent: PageBase, context: any, closeCallback: Function, fullscreen?: boolean) {
        parent._modal = this;
        const that = this;
        this._modalContext = context;
        this._closeModalCallback = function () {
            if (that._closeModalCallback) {
                that._closeModalCallback = null;
                that._modalContext = null;
                that._hideNativeModalView(parent);
                if (typeof closeCallback === "function") {
                    closeCallback.apply(undefined, arguments);
                }
            }
        };
    }

    protected _hideNativeModalView(parent: PageBase) {
        //
    }

    public _raiseShownModallyEvent() {
        let args: ShownModallyData = {
            eventName: PageBase.shownModallyEvent,
            object: this,
            context: this._modalContext,
            closeCallback: this._closeModalCallback
        };
        this.notify(args);
    }

    protected _raiseShowingModallyEvent() {
        let args: ShownModallyData = {
            eventName: PageBase.showingModallyEvent,
            object: this,
            context: this._modalContext,
            closeCallback: this._closeModalCallback
        }
        this.notify(args);
    }

    public _getStyleScope(): StyleScope {
        return this._styleScope;
    }

    public _eachChildView(callback: (child: View) => boolean) {
        super._eachChildView(callback);
        callback(this.actionBar);
    }

    get _childrenCount(): number {
        return (this.content ? 1 : 0) + (this.actionBar ? 1 : 0);
    }

    private _applyCss() {
        if (this._cssApplied) {
            return;
        }

        this._styleScope.ensureSelectors();

        const scope = this._styleScope;
        const checkSelectors = (view: View): boolean => {
            scope.applySelectors(view);
            return true;
        };

        checkSelectors(this);
        eachDescendant(this, checkSelectors);

        this._cssApplied = true;
    }

    private _resetCssValues() {
        const resetCssValuesFunc = (view: View): boolean => {
            view.style._resetCssValues();
            return true;
        };

        resetCssValuesFunc(this);
        eachDescendant(this, resetCssValuesFunc);
    }
}

/**
 * Dependency property used to hide the Navigation Bar in iOS and the Action Bar in Android.
 */
export const actionBarHiddenProperty = new Property<PageBase, boolean>({ name: "actionBarHidden", affectsLayout: isIOS, valueConverter: booleanConverter });
actionBarHiddenProperty.register(PageBase);

/**
 * Dependency property that specify if page background should span under status bar.
 */
export const backgroundSpanUnderStatusBarProperty = new Property<PageBase, boolean>({ name: "backgroundSpanUnderStatusBar", defaultValue: false, affectsLayout: isIOS, valueConverter: booleanConverter });
backgroundSpanUnderStatusBarProperty.register(PageBase);

/**
 * Dependency property used to control if swipe back navigation in iOS is enabled.
 * This property is iOS sepecific. Default value: true
 */
export const enableSwipeBackNavigationProperty = new Property<PageBase, boolean>({ name: "enableSwipeBackNavigation", defaultValue: true, valueConverter: booleanConverter });
enableSwipeBackNavigationProperty.register(PageBase);
