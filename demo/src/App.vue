<template>
  <div id="demo-cesium" :ref="cesiumRefFn"></div>
  <p>1234</p>
</template>

<script lang="ts">
import { defineComponent, onMounted } from 'vue';
import { Viewer } from 'cesium';
import { TimePrimitiveCollection, PrimitiveMeta } from '../../lib/collection/primitive'
import * as Cesium from 'cesium';
let viewer: Viewer;
export default defineComponent({
  name: 'App',
  setup() {
    let cesiumRef: Element;
    const cesiumRefFn = (el: any) => {
      cesiumRef = el;
    };

    onMounted(async () => {
      Cesium.Ion.defaultAccessToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIzNzFhYTkxOC02ODliLTQwMDMtOTdkNS04MDZlZmVmZjZkNzUiLCJpZCI6MzAxNzgsInNjb3BlcyI6WyJhc2wiLCJhc3IiLCJhc3ciLCJnYyIsInByIl0sImlhdCI6MTU5MzMxNzI3MX0.3bSbYDm83GQM53wcNAWvtLcTAxdFfRJCTijGPpkKwkA';
      viewer = new Viewer('demo-cesium');
    });

    return {
      cesiumRefFn
    };
  }
});
</script>

<style>
</style>
