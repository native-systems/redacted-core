import { PartiallyOrderedSet } from "../../utils/PartiallyOrderedSet"


export type RenderStepIdentifierType = symbol

export const newRenderStepIdentifier = (name?: string) => Symbol(name)

const commonSteps = [...Array(4).keys()].map(() => newRenderStepIdentifier())

type Stage = {
  start: RenderStepIdentifierType
  end: RenderStepIdentifierType
}

const createStage =
  (start: RenderStepIdentifierType, end: RenderStepIdentifierType): Stage => ({
    start: start,
    end: end
  })

export const UserInterfaceStage = createStage(commonSteps[0], commonSteps[1])
export const SubviewStage = createStage(commonSteps[1], commonSteps[2])
export const GlobalOverlayStage = createStage(commonSteps[2], commonSteps[3])

export const initializeRenderSteps = () => {
  const set = new PartiallyOrderedSet<RenderStepIdentifierType>()
  let last = null
  for (const stepIdentifier of commonSteps) {
    set.add(stepIdentifier)
    if (last)
      set.order(last, stepIdentifier)
    last = stepIdentifier
  }
  return set
}
