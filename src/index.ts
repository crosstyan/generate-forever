import * as O from "fp-ts/Option"
import { Option, None, Some, match } from "fp-ts/Option"
import { tell } from "fp-ts/lib/Writer"
import { Subject, Subscription } from "rxjs"

/**
 * Also refer to:
 * https://sourceforge.net/p/greasemonkey/wiki/Metadata_Block/#homepageurl
 */

const GenerateEN = "Generate"
const GenerateJP = "生成"

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
    stopGenerateForeverMode: "Stop Generate Forever Mode",
    autoSaveEnabled: "Auto Save Enabled",
    autoSaveDisabled: "Auto Save Disabled",
}

const btnStyle = `
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

interface GeneratedEvent {
    observer: MutationObserver
    time: Date
    element: Element
}

/**
 * Asserts that the given option is Some
 */
function assertSome <T>(o: O.Option<T>): asserts o is O.Some<T> {
    if (O.isNone(o)) {
        throw new Error("assertSome failed")
    }
}

/**
 * Unwraps the given option.
 */
const unwrap = <T>(o: O.Option<T>): T => {
    if (O.isNone(o)) {
        throw new Error("unwrap failed")
    }
    return o.value
}

const generatedSubject = new Subject<GeneratedEvent>()

let isGeneratingForever = false
let isAutoSave = true
let generateBtns = [] as HTMLElement[]
let subscription: Subscription | null = null
let foreverBtn = O.none as O.Option<HTMLElement>
let autoSaveBtn = O.none as O.Option<HTMLElement>

const getMainWindow = (): O.Option<Element> => {
    const els = document.getElementsByClassName(MAIN_WINDOW_CLASSNAME)
    if (els.length == 0) {
        return O.none
    }
    return O.some(els[0])
}

// https://stackoverflow.com/questions/10767701/javascript-css-get-element-by-style-attribute
const getGenerateButtons = (): HTMLElement[] => {
    const els = document.getElementsByTagName("button")
    const filtered = Array.from(els).filter((el) => {
        const isGen = el.outerHTML.includes(GenerateEN) || el.outerHTML.includes(GenerateJP)
        return isGen
    })
    return filtered
}

const appendCustomArea = (generateBtn: HTMLElement): Option<HTMLElement> => {
    const customArea = document.createElement("div")
    customArea.style.display = "flex"
    if (generateBtn.parentElement == null) {
        return O.none
    }
    generateBtn.parentElement.appendChild(customArea)
    return O.some(customArea)
}

const appendGenerateForeverButton = (customArea: HTMLElement): HTMLElement => {
    const foreverBtn = document.createElement("button")
    foreverBtn.innerText = Text.generateForeverMode
    foreverBtn.style.cssText = btnStyle
    customArea.appendChild(foreverBtn)
    return foreverBtn
}

const appendAutoSaveButton = (customArea: HTMLElement): HTMLElement => {
    const saveBtn = document.createElement("button")
    saveBtn.innerText = Text.autoSaveEnabled
    saveBtn.style.cssText = btnStyle
    customArea.appendChild(saveBtn)
    return saveBtn
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
    if (isAutoSave) {
        const saveBtn = getSaveBtn()
        if (O.isNone(saveBtn)) {
            console.error("save button not found")
            return
        }
        console.log("click save button");
        (saveBtn.value as HTMLElement).click()
    }
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
    const customArea = appendCustomArea(generateBtns[0])
    if (O.isNone(customArea)) {
        console.error("failed to append custom area")
        return false
    }
    foreverBtn = O.some(appendGenerateForeverButton(customArea.value))
    assertSome(foreverBtn)
    foreverBtn.value.onclick = () => {
        if (O.isNone(foreverBtn)) {
            console.log("forever button not found")
            return
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
    autoSaveBtn = O.some(appendAutoSaveButton(customArea.value)) 
    assertSome(autoSaveBtn)
    autoSaveBtn.value.onclick = () => {
        if (O.isNone(autoSaveBtn)) {
            console.log("auto save button not found")
            return
        }
        if (isAutoSave) {
            isAutoSave = false
            autoSaveBtn.value.innerText = Text.autoSaveDisabled
            autoSaveBtn.value.style.backgroundColor = BTN_STOP_COLOR
        } else {
            isAutoSave = true
            autoSaveBtn.value.innerText = Text.autoSaveEnabled
            autoSaveBtn.value.style.backgroundColor = BTN_NORMAL_COLOR
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
