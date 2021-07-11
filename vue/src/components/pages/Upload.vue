<template>
    <div class="image-upload" @drop.prevent="addFile" @dragover.prevent>
        <svg xmlns="http://www.w3.org/2000/svg" v-if="!this.file" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="24" height="24" viewBox="0 0 24 24"><path d="M9,16V10H5L12,3L19,10H15V16H9M5,20V18H19V20H5Z" /></svg>
        
        <div class="help-text" v-if="!this.file">Upload an image to convert</div>
        <div class="image-preview" v-else>
            <img height="128px" @click="submitImage()" :src="previewURL()" />
        </div>
    </div>
</template>

<script>
export default {
    name: "MCMap-Upload",
    data() {
        return {
            file: null
        };
    },
    methods: {
        addFile(e) {
            let droppedFiles = e.dataTransfer.files;

            if(!droppedFiles) return;
            if (droppedFiles.length > 1) return; // TODO Display Error. 
            // TODO if not an image display error.

            this.file = droppedFiles[0];
            console.log(this.file);
        },
        previewURL() {
            return URL.createObjectURL(this.file);
        },
        submitImage() {
            alert('Coming soon ;)');
        }
    }
}
</script>

<style scoped>
    /* Upload "form" */
    .image-upload {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 8px;

        min-height: 50px;
        
        font-weight: bold;
        user-select: none;
    }

    .image-upload > svg {
        width: 50px;
        height: 50px;
        fill: white;
    }
</style>