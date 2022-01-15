import {
  Viewer,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined
} from "cesium";

/**
 * 
 * @param viewer Cesium.Viewer
 * @param onClick click function input (target, movement)
 * @returns destroy function
 */
export function useClick(viewer: Viewer, onClick: Function): Function {
  let clickScreenSpaceEventHandler = new ScreenSpaceEventHandler(viewer.canvas)
  clickScreenSpaceEventHandler.setInputAction((movement) => {
    // Pick a new feature
    let pickedFeature = viewer.scene.pick(movement.position);
    // Feature can be undefined. 
    // Consider follow: Cesium.defined(pickedFeature)
    onClick(pickedFeature, movement);
  },
    ScreenSpaceEventType.LEFT_CLICK);
  return clickScreenSpaceEventHandler.destroy
}

/**
 * 
 * @param viewer 
 * @param onMovein move into target function input (target, movement)
 * @param onMoveout move out target function input (target, movement)
 * @returns destroy function
 */
export function useMove(viewer: Viewer, onMovein?: Function, onMoveout?: Function): Function {
  let moveScreenSpaceEventHandler = new ScreenSpaceEventHandler(viewer.canvas)
  let movedFeature: any = null;
  moveScreenSpaceEventHandler.setInputAction((movement) => {
    // Pick a new feature
    let position = movement.endPosition
    let pickedFeature = viewer.scene.pick(position);
    // Get screen position
    // let intersection
    // if (viewer.scene.mode === SceneMode.SCENE3D) {
    //   const ray = viewer.scene.camera.getPickRay(position);
    //   intersection = viewer.scene.globe.pick(ray, viewer.scene);
    // } else {
    //   intersection = viewer.scene.camera.pickEllipsoid(position, viewer.scene.globe.ellipsoid);
    // }
    if (!defined(pickedFeature)) {
      // Leave from previous feature
      if (onMoveout && movedFeature) {
        onMoveout(movedFeature, movement)
      }
      // clear pickedfeature
      movedFeature = null
    }
    else if (movedFeature !== pickedFeature) {
      // Move in new feature
      if (onMovein) {
        onMovein(pickedFeature, movement)
      }
      // Refresh pickedfeature
      movedFeature = pickedFeature
    }
  },
    ScreenSpaceEventType.MOUSE_MOVE);
  return moveScreenSpaceEventHandler.destroy
}