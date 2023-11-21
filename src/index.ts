import * as O from "fp-ts/Option"
import { tell } from "fp-ts/lib/Writer"
import { Subject, Subscription } from "rxjs"

/**
 * Also refer to:
 * https://sourceforge.net/p/greasemonkey/wiki/Metadata_Block/#homepageurl
 */

const GenerateEn = "Generate"
const GenerateJp = "生成"

// not theme dependent
// observe this at start
const MAIN_WINDOW_CLASSNAME = "ePFPNa"
// not theme dependent
const SAVE_BUTTON_CLASSNAME = "hpVEuL"

const DELAY_RANGE_MS: [number, number] = [1000, 3000]
const BTN_NORMAL_COLOR = "rgb(245, 243, 194)"
const BTN_STOP_COLOR = "rgb(245, 194, 194)"

const Text = {
    generateForeverMode: "Generate Forever Mode",
    stopGenerateForeverMode: "Stop Generate Forever Mode"
}

interface GeneratedEvent {
    observer: MutationObserver
    time: Date
    element: Element
}

const generatedSubject = new Subject<GeneratedEvent>()

let isGeneratingForever = false
let generateBtns = [] as HTMLElement[]
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
const notDisplayNone = (element: Element) => {
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

// https://stackoverflow.com/questions/10767701/javascript-css-get-element-by-style-attribute
const getGenerateButtons = (): HTMLElement[] => {
    const els = document.getElementsByTagName("button")
    const filtered = Array.from(els).filter((el) => {
        const isGen = el.outerHTML.includes(GenerateEn) || el.outerHTML.includes(GenerateJp)
        return isGen
    })
    return filtered
}

const copyStyle = (src: HTMLElement, dst: HTMLElement) => {
    const style = window.getComputedStyle(src)
    for (const key of style) {
        dst.style.setProperty(key, style.getPropertyValue(key))
    }
}

const appendGenerateForeverButton = (generateBtn: HTMLElement): O.Option<HTMLElement> => {
    const foreverBtn = document.createElement(generateBtn.tagName)
    foreverBtn.innerText = Text.generateForeverMode
    foreverBtn.style.cssText = `
    display: flex;
    flex-direction: row;
    -webkit-box-align: center;
    align-items: center;
    -webkit-box-pack: justify;
    justify-content: space-between;
    background-color: ${BTN_NORMAL_COLOR};
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
                const eles = added.getElementsByTagName("img")
                if (eles.length != 0) {
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
                } else {
                    console.warn("not picture frame", added)
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
        console.error("save button not found")
        return O.none
    }
    return O.some(els[0])
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
    console.log("click save button");
    (saveBtn.value as HTMLElement).click()
    if (generateBtns.length == 0) {
        generateBtns = getGenerateButtons()
    }
    const [min, max] = DELAY_RANGE_MS
    const delay = Math.floor(Math.random() * (max - min)) + min
    console.log("delay", delay)
    setTimeout(() => {
        console.log("click generate button")
        generateBtns[0].click()
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
    generateBtns = getGenerateButtons()
    if (generateBtns.length == 0) {
        console.error("generate button not found")
        return false
    }
    console.log("generate buttons", generateBtns)
    foreverBtn = appendGenerateForeverButton(generateBtns[0])
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
            console.log("exit forever mode")
            isGeneratingForever = false
            foreverBtn.value.innerText = Text.generateForeverMode
            foreverBtn.value.style.backgroundColor = BTN_NORMAL_COLOR
            if (subscription != null) {
                subscription.unsubscribe()
                subscription = null
            } else {
                console.error("subscription is null")
            }
        } else {
            console.log("enter forever mode")
            isGeneratingForever = true
            foreverBtn.value.innerText = Text.stopGenerateForeverMode
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
