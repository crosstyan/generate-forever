import * as O from "fp-ts/Option"
import { Option, None, Some, match } from "fp-ts/Option"
import { Subject, Subscription, debounceTime } from "rxjs"

/**
 * Also refer to:
 * https://sourceforge.net/p/greasemonkey/wiki/Metadata_Block/#homepageurl
 */

const GenerateEN = "Generate"
const GenerateJP = "生成"

const TOASTIFY_CLASSNAME = "Toastify"
const TOASTIFY_CONTAINER_CLASSNAME = "Toastify__toast-container"
const DEBOUNCE_TIME_MS = 600

const DELAY_RANGE_MS: [number, number] = [1000, 3000]
const BTN_NORMAL_COLOR = "rgb(245, 243, 194)"
const BTN_STOP_COLOR = "rgb(245, 194, 194)"

const getMain = () => {
  const n = document.getElementsByClassName('display-grid-images')
  if (n.length != 1) {
    throw new Error("display-grid-images not found or ambiguous")
  }
  return n[0]
}

const Text = {
  generateForeverMode: "Once",
  stopGenerateForeverMode: "Generate Forever",
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
function assertSome<T>(o: O.Option<T>): asserts o is O.Some<T> {
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
const toastSubject = new Subject<GeneratedEvent>()
const debounceToastObs = toastSubject.pipe(debounceTime(DEBOUNCE_TIME_MS))

let isGeneratingForever = false
let generateBtns = [] as HTMLElement[]
let subscription: Subscription | null = null
let foreverBtn = O.none as O.Option<HTMLElement>
let toastObs = O.none as O.Option<MutationObserver>
let mainWindowObs = O.none as O.Option<MutationObserver>
let toastSub: Subscription | null = null

const getMainWindow = (): O.Option<Element> => {
  try {
    const main = getMain()
    return O.some(main)
  } catch (e) {
    console.error("cannot find main window", e)
    return O.none
  }
}

const randomRange = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min)) + min
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
  foreverBtn.innerText = isGeneratingForever ? Text.stopGenerateForeverMode : Text.generateForeverMode
  foreverBtn.style.cssText = btnStyle
  foreverBtn.style.backgroundColor = isGeneratingForever ? BTN_STOP_COLOR : BTN_NORMAL_COLOR
  customArea.appendChild(foreverBtn)
  return foreverBtn
}

const mainWindowObsCallback: MutationCallback = (muts: MutationRecord[], obs: MutationObserver) => {
  // I need to get the attribute changes
  // I could just skip the attr observer and use the main window observer only
  // see also `image-grid-image` (should be target)
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

const toastObsCallback: MutationCallback = (muts: MutationRecord[], obs: MutationObserver) => {
  for (const rec of muts) {
    for (const added of rec.addedNodes) {
      if (added instanceof Element) {
        added as Element
        const classes = added.className
        if (classes.includes(TOASTIFY_CONTAINER_CLASSNAME)) {
          console.log("toastify container", added)
          const ev: GeneratedEvent = {
            time: new Date(),
            observer: obs,
            element: added
          }
          toastSubject.next(ev)
        }
      }
    }
  }
}

const onPicture = (ev: GeneratedEvent) => {
  const el = ev.element
  const src = el.getAttribute("src")
  console.debug("onPicture", ev)
  if (generateBtns.length == 0) {
    generateBtns = getGenerateButtons()
  }
  const [min, max] = DELAY_RANGE_MS
  const delay = Math.floor(Math.random() * (max - min)) + min
  console.debug("delay", delay)
  setTimeout(() => {
    console.info("click generate button")
    generateBtns[0].click()
  }, delay)
}


const init = (): boolean => {
  // reset all of the global variables
  generateBtns = []
  if (subscription != null) {
    isGeneratingForever = false
    subscription.unsubscribe()
    subscription = null
  }
  foreverBtn = O.none

  const main = getMainWindow()
  if (O.isNone(main)) {
    return false
  }

  if (O.isNone(mainWindowObs)) {
    mainWindowObs = O.some(new MutationObserver(mainWindowObsCallback))
    assertSome(mainWindowObs)
    mainWindowObs.value.observe(main.value, {
      childList: true,
      subtree: true,
      attributes: true
    })
  }

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
  const enterForeverMode = () => {
    assertSome(foreverBtn)
    console.log("enter forever mode")
    isGeneratingForever = true
    foreverBtn.value.innerText = Text.stopGenerateForeverMode
    foreverBtn.value.style.backgroundColor = BTN_STOP_COLOR
    // we need the debounce to prevent the streaming going crazy
    subscription = generatedSubject
      .pipe(debounceTime(DEBOUNCE_TIME_MS))
      .subscribe(onPicture)
  }
  const exitForeverMode = () => {
    assertSome(foreverBtn)
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
  }

  foreverBtn.value.onclick = () => {
    if (isGeneratingForever) {
      exitForeverMode()
    } else {
      enterForeverMode()
    }
  }

  const registerToastifySub = () => {
    const toastifyEls = document.getElementsByClassName(TOASTIFY_CLASSNAME)
    if (toastifyEls.length != 1) {
      console.error("toastify not found or ambiguous")
      return false
    }
    const toastifyEl = toastifyEls[0]
    const toastObserver = new MutationObserver(toastObsCallback)
    toastObs = O.some(toastObserver)
    toastObserver.observe(toastifyEl, {
      subtree: true,
      childList: true,
      attributes: true
    })
    toastSub = debounceToastObs.subscribe((_) => {
      if (isGeneratingForever) {
        console.warn("toastify detected, might be an error; click generate button")
        const delay = randomRange(200, 400)
        setTimeout(() => {
          console.log("click generate button")
          generateBtns[0].click()
        }, delay)
      }
    })
  }

  if (O.isSome(toastObs)) {
    toastObs.value.disconnect()
    toastSub?.unsubscribe()
    toastSub = null
    registerToastifySub()
  } else {
    registerToastifySub()
  }

  // you could call this function from the console
  // without the need to reload the page
  // https://developer.mozilla.org/en-US/docs/Web/Events/Creating_and_triggering_events
  if (O.isNone(mainWindowObs)) {
    console.log("first start, listen to `gen_4eva` message")
    window.addEventListener("gen_4eva", (_) => {
      console.log("trigger init from message")
      init()
    })
  }

  /**
   * to trigger init from the console
   * 
   * ```js
   * window.dispatchEvent(new CustomEvent("gen_4eva"))
   * ```
   * 
   * when to use? when you find that the buttons are missing 
   * (usually after inpaint)
   */
  return true
}

  ; (() => {
    'use strict'
    const handle = setInterval(() => {
      if (init()) {
        clearInterval(handle)
      }
    }, 1000)
  })()

// @ts-expect-error
window.init_gen_4eva = init
