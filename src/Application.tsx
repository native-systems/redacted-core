import React, { ComponentType, ReactNode, RefObject, useEffect, useRef }
  from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { WebGLRenderer } from "three"

import { AnimationHandler } from './motion/Animation'
import { InputManager } from './input/InputManager'
import { Renderer, RendererInterface } from './components/rendering/Renderer'
import { LayerStack, LayerConfigurationArray }
  from './components/rendering/LayerStack'


const RenderScreen = (
  { view }: { view: RefObject<RendererInterface | null> }
) => {
  // -3 executes tracking routines before camera controls run
  useFrame(() => view.current?.resolveComponentVolatiles(), -3)
  useFrame(() => view.current?.render(), 1)
  return <></>
}

type MainSceneProps = {
  children: ReactNode
  MainCameraClass: ComponentType<any>
  LayerClasses: LayerConfigurationArray
}

const MainScene = (
  { MainCameraClass, LayerClasses, children }: MainSceneProps
) => {
  const invalidate = useThree(state => state.invalidate)
  const mainView = useRef<RendererInterface>(null)

  useEffect(() => mainView.current?.attachOnInvalidate(invalidate), [])

  return (
    <>
      <Renderer ref={mainView}>
        <LayerStack
          MainCameraClass={MainCameraClass}
          LayerClasses={LayerClasses}
          >
          {children}
        </LayerStack>
        <AnimationHandler />
      </Renderer>
      <RenderScreen view={mainView} />
    </>
  )
}

type ApplicationProps = {
  children: ReactNode
  eventSource: HTMLElement
  MainCameraClass: ComponentType<any>
  LayerClasses: LayerConfigurationArray
}

/**
 * Root element of the application. This component hosts the Canvas, input
 * components and low-level renderer.
 * @param props.eventSource the root HTML element to receive events from
 * @param props.MainCameraClass a component class that instantiates main cameras
 * @param props.LayerClasses a name-layer configuration map
 * @param props.children redacted or react-three-fiber components
 */
export const Application = (
  { eventSource, MainCameraClass, LayerClasses, children }: ApplicationProps
) => {
  const inputManager = InputManager()

  return (
    <inputManager.CaptureArea>
      <Canvas
        eventSource={eventSource}
        eventPrefix="client"
        frameloop='demand'
        gl={(domElement) => {
          return new WebGLRenderer({
            canvas: domElement.canvas,
            antialias: true,
            powerPreference: "high-performance"

          })
        }}
        >
        <MainScene
          MainCameraClass={MainCameraClass}
          LayerClasses={LayerClasses}
          >
          {children}
        </MainScene>
      </Canvas>
    </inputManager.CaptureArea>
  )
}
