import * as O from "fp-ts/Option"
import { cons } from "fp-ts/lib/ReadonlyNonEmptyArray"
import { Subject, Subscription } from "rxjs"

const GENERATE_BUTTON_CLASSNAME = "kMUUYF"
// observe this at start
const MAIN_WINDOW_CLASSNAME = "gStylA"
// observe the attributions changes of this
const PICTURE_CLASSNAME = "lcxhIe"
const BOTTOM_TOOLBAR_CLASSNAME = "bSBA-Dm"
const SMALL_ICON_CLASSNAME = "hPQOUn"
const SAVE_BUTTON_CLASSNAME = "hpVEuL"
const DATA_PROJECTION_ATTRIBUTE_NAME = "data-projection-id"
const DATA_PROJECTION_ATTRIBUTE_VALUE = 26

const DELAY_RANGE_MS: [number, number] = [1000, 3000]
const BTN_NORMAL_COLOR = "rgb(245, 243, 194)"
const BTN_STOP_COLOR = "rgb(245, 194, 194)"

interface GeneratedEvent {
    observer: MutationObserver
    time: Date
    element: Element
}

const generatedSubject = new Subject<GeneratedEvent>()

let isGeneratingForever = false
let subscription: Subscription | null = null
let foreverBtn = O.none as O.Option<HTMLElement>

const getMainWindow = (): O.Option<Element> => {
    const els = document.getElementsByClassName(MAIN_WINDOW_CLASSNAME)
    if (els.length == 0) {
        return O.none
    }
    return O.some(els[0])
}

// https://stackoverflow.com/questions/53047318/performant-way-to-find-out-if-an-element-or-any-of-its-ancestor-elements-has-dis#:~:text=The%20easiest%20way%20to%20see,offsetParent%20.&text=This%20code%20converts%20el.,element%20is%20showing%20or%20not.
function notDisplayNone(element: Element) {
    // Start with the element itself and move up the DOM tree
    for (let el: Element | ParentNode | Document = element; el && el !== document; el = el.parentNode) {
        if (el instanceof Element) {
            if (window.getComputedStyle(el).display === "none") {
                return false
            }
        } else {
            return true
        }
    }
    // Neither element itself nor any parents have display 'none', so return true
    return true
}

const getGenerateButton = (): O.Option<Element> => {
    const els = document.getElementsByClassName(GENERATE_BUTTON_CLASSNAME)
    for (const el of els) {
        if (notDisplayNone(el)) {
            return O.some(el)
        }
    }
    return O.none
}

const copyStyle = (src: HTMLElement, dst: HTMLElement) => {
    const style = window.getComputedStyle(src)
    for (const key of style) {
        dst.style.setProperty(key, style.getPropertyValue(key))
    }
}

const appendGenerateForeverButton = (generateBtn: HTMLElement): O.Option<HTMLElement> => {
    const foreverBtn = document.createElement(generateBtn.tagName)
    foreverBtn.innerText = "Generate Forever"
    foreverBtn.style.cssText = `
    display: flex;
    flex-direction: row;
    -webkit-box-align: center;
    align-items: center;
    -webkit-box-pack: justify;
    justify-content: space-between;
    background-color: rgb(245, 243, 194);
    color: rgb(26, 28, 46);
    font-size: 0.875rem;
    height: 44px;
    border-radius: 3px;
    overflow: hidden;
    cursor: pointer;
    font-weight: 700;
    transition: color 100ms ease 0s, background-color 100ms ease 0s, transform 150ms ease 0s;
    padding: 10px 10px 10px 20px;
    gap: 20px;
    margin-top: 10px;
    width: 100%;
    `
    if (generateBtn.parentElement == null) {
        return O.none
    }
    generateBtn.parentElement.appendChild(foreverBtn)
    return O.some(foreverBtn)
}

const pictureAttrObsCallback = (muts: MutationRecord[], obs: MutationObserver) => {
    for (const rec of muts) {
        if (rec.attributeName == "src") {
            const el = rec.target as Element
            const src = el.getAttribute("src")
            if (src != null) {
                const ev: GeneratedEvent = {
                    time: new Date(),
                    observer: obs,
                    element: el
                }
                generatedSubject.next(ev)
            }
        }
    }
}


const mainWindowObsCallback: MutationCallback = (muts: MutationRecord[], obs: MutationObserver) => {
    for (const rec of muts) {
        for (const added of rec.addedNodes) {
            if (added instanceof Element) {
                added as Element
                if (added.className.includes(PICTURE_CLASSNAME)) {
                    console.log("picture frame", added)
                    const attrObs = new MutationObserver(pictureAttrObsCallback)
                    attrObs.observe(added, {
                        subtree: true,
                        childList: true,
                        attributes: true
                    })
                    const ev: GeneratedEvent = {
                        time: new Date(),
                        observer: attrObs,
                        element: added
                    }
                    generatedSubject.next(ev)
                    obs.disconnect()
                }
            } else {
                console.error("added is not Element", added)
            }
        }
    }
}

const getSaveBtn = (): O.Option<Element> => {
    const els = document.getElementsByClassName(SAVE_BUTTON_CLASSNAME)
    if (els.length == 0) {
        return O.none
    }
    const el = els[0]
    for (let ele = el; ele != null; ele = ele.parentElement) {
        if (ele instanceof HTMLElement) {
            if (ele.getAttribute(DATA_PROJECTION_ATTRIBUTE_NAME) == DATA_PROJECTION_ATTRIBUTE_VALUE.toString()) {
                return O.some(ele)
            }
        }
    }
    return O.none
}

const onPicture = (ev: GeneratedEvent) => {
    const el = ev.element
    const src = el.getAttribute("src")
    console.log("onPicture", ev)
    const saveBtn = getSaveBtn()
    if (O.isNone(saveBtn)) {
        console.error("save button not found")
        return
    }
    (saveBtn.value as HTMLElement).click()
    const generateBtn = getGenerateButton()
    if (O.isNone(generateBtn)) {
        console.error("generate button not found")
        return
    }
    const [min, max] = DELAY_RANGE_MS
    const delay = Math.floor(Math.random() * (max - min)) + min
    console.log("delay", delay)
    setTimeout(() => {
        (generateBtn.value as HTMLElement).click()
    }, delay)
}


const init = (): boolean => {
    const main = getMainWindow()
    if (O.isNone(main)) {
        console.error("main window not found")
        return false
    }
    const mainWindowObs = new MutationObserver(mainWindowObsCallback)
    mainWindowObs.observe(main.value, {
        childList: true,
        subtree: true
    })
    const generateBtn = getGenerateButton() as O.Option<HTMLElement>
    if (O.isNone(generateBtn)) {
        console.error("generate button not found")
        return false
    }
    foreverBtn = appendGenerateForeverButton(generateBtn.value) as O.Option<HTMLElement>
    if (O.isNone(foreverBtn)) {
        console.error("failed to append forever button")
        return false
    }
    foreverBtn.value.onclick = () => {
        if (O.isNone(foreverBtn)) {
            console.log("forever button not found")
            return false
        }
        if (isGeneratingForever) {
            isGeneratingForever = false
            foreverBtn.value.innerText = "Generate Forever"
            foreverBtn.value.style.backgroundColor = BTN_NORMAL_COLOR
            if (subscription != null) {
                subscription.unsubscribe()
            } else {
                console.error("subscription is null")
            }
        } else {
            isGeneratingForever = true
            foreverBtn.value.innerText = "Stop Generating Forever"
            foreverBtn.value.style.backgroundColor = BTN_STOP_COLOR
            subscription = generatedSubject.subscribe(onPicture)
        }
    }
    return true
}

const ____ = 0;
(() => {
    'use strict'
    const handle = setInterval(() => {
        if (init()) {
            clearInterval(handle)
        }
    }, 1000)
})()
