import { addChatBarButton, ChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { classes } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { findLazy, findStoreLazy } from "@webpack";
import { ChannelStore, Constants, FluxDispatcher, MessageActions, PermissionsBits, PermissionStore, RestAPI, SelectedChannelStore, showToast, SnowflakeUtils, Toasts, useState } from "@webpack/common";

const cl = classNameFactory("vc-gary-");
const CloudUpload = findLazy(m => m.prototype?.trackUploadFinished);
const PendingReplyStore = findStoreLazy("PendingReplyStore");
export function GaryIcon({ height = 30, width = 30, className }: { height?: number; width?: number; className?: string; }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} fill="none" viewBox="0 0 24 24" className={classes(className, cl("icon"))}>
            <path
                fill="currentColor"
                fillRule="evenodd"
                d="M11.75 6.406c-1.48 0-1.628.157-2.394.157C8.718 6.563 6.802 5 5.845 5c-.958 0-2.075.563-2.075 2.188v1.875c.002.492.18 2 .88 1.597-.827.978-.91 2.119-.899 3.223-.223.064-.45.137-.671.212-.684.234-1.41.532-1.737.744a.75.75 0 0 0 .814 1.26c.156-.101.721-.35 1.408-.585l.228-.075c.046.433.161.83.332 1.19l-.024.013c-.41.216-.79.465-1.032.623l-.113.074a.75.75 0 1 0 .814 1.26l.131-.086c.245-.16.559-.365.901-.545.08-.043.157-.081.231-.116C6.763 19.475 9.87 20 11.75 20s4.987-.525 6.717-2.148c.074.035.15.073.231.116.342.18.656.385.901.545l.131.086a.75.75 0 0 0 .814-1.26l-.113-.074a13.008 13.008 0 0 0-1.032-.623l-.024-.013c.171-.36.286-.757.332-1.19l.228.075c.687.235 1.252.484 1.409.585a.75.75 0 0 0 .813-1.26c-.327-.212-1.053-.51-1.736-.744-.221-.075-.449-.148-.672-.213.012-1.104-.072-2.244-.9-3.222.7.403.88-1.105.881-1.598V7.188C19.73 5.563 18.613 5 17.655 5c-.957 0-2.873 1.563-3.51 1.563-.767 0-.915-.157-2.395-.157Zm-.675 9.194c.202-.069.441-.1.675-.1.234 0 .473.031.676.1.1.034.22.088.328.174a.619.619 0 0 1 .246.476c0 .23-.139.39-.246.476-.107.086-.229.14-.328.174-.203.069-.442.1-.676.1-.234 0-.473-.031-.675-.1a1.078 1.078 0 0 1-.329-.174.619.619 0 0 1-.246-.476c0-.23.139-.39.246-.476.107-.086.23-.14.329-.174Zm2.845-3.1c.137-.228.406-.5.81-.5s.674.272.81.5c.142.239.21.527.21.813 0 .285-.068.573-.21.811-.136.229-.406.501-.81.501s-.673-.272-.81-.5a1.596 1.596 0 0 1-.21-.813c0-.285.068-.573.21-.811Zm-5.96 0c.137-.228.406-.5.81-.5s.674.272.81.5c.142.239.21.527.21.813 0 .285-.068.573-.21.811-.136.229-.406.501-.81.501s-.673-.272-.81-.5a1.596 1.596 0 0 1-.21-.813c0-.285.068-.573.21-.811Z"
                clipRule="evenodd"
            />
        </svg>
    );
}

const settings = definePluginSettings({
    randomGarySendMethod: {
        description: "Choose the buttons behavior.",
        type: OptionType.SELECT,
        options: [
            { label: "Left Click: Send as a link, Right Click: Send as an attachment", value: "link", default: true },
            { label: "Left Click: Send as an attachment, Right Click: Send as a link", value: "attachment" }
        ],
    },
});

async function sendGaryLink(channelId: string, link: string) {
    const reply = PendingReplyStore.getPendingReply(channelId);
    if (reply) FluxDispatcher.dispatch({ type: "DELETE_PENDING_REPLY", channelId });
    try {
        const channel = ChannelStore.getChannel(channelId);
        if (channel.guild_id && !PermissionStore.can(PermissionsBits.EMBED_LINKS, channel)) {
            showToast("Missing required permissions to embed links", Toasts.Type.FAILURE);
            return;
        }
        RestAPI.post({
            url: Constants.Endpoints.MESSAGES(channelId),
            body: {
                channel_id: channelId,
                content: link,
                nonce: SnowflakeUtils.fromTimestamp(Date.now()),
                sticker_ids: [],
                type: 0,
                attachments: [],
                message_reference: reply ? MessageActions.getSendMessageOptionsForReply(reply)?.messageReference : null,
            }
        });
    } catch (error) {
        console.error("Failed to send Gary link:", error);
        showToast("Failed to send Gary image", Toasts.Type.FAILURE);
    }
}

async function uploadGaryImage(url: string, channelId: string) {
    const reply = PendingReplyStore.getPendingReply(channelId);
    if (reply) FluxDispatcher.dispatch({ type: "DELETE_PENDING_REPLY", channelId });
    try {
        const channel = ChannelStore.getChannel(channelId);

        if (channel.guild_id && !PermissionStore.can(PermissionsBits.ATTACH_FILES, channel)) {
            showToast("Missing required permissions to upload files", Toasts.Type.FAILURE);
            return;
        }

        showToast("Uploading image, this may take a few seconds.", Toasts.Type.MESSAGE);
        const response = await fetch(url);
        const blob = await response.blob();
        const file = new File([blob], "gary.jpg", { type: "image/jpeg" });

        const upload = new CloudUpload({
            file,
            isThumbnail: false,
            platform: 1,
        }, channelId, false, 0);

        upload.on("complete", () => {
            RestAPI.post({
                url: Constants.Endpoints.MESSAGES(channelId),
                body: {
                    channel_id: channelId,
                    content: "",
                    nonce: SnowflakeUtils.fromTimestamp(Date.now()),
                    sticker_ids: [],
                    type: 0,
                    attachments: [{
                        id: "0",
                        filename: upload.filename,
                        uploaded_filename: upload.uploadedFilename
                    }],
                    message_reference: reply ? MessageActions.getSendMessageOptionsForReply(reply)?.messageReference : null,
                }
            });
        });

        upload.on("error", () => showToast("Failed to upload Gary image", Toasts.Type.FAILURE));
        upload.upload();

    } catch (error) {
        console.error("Failed to upload Gary image:", error);
        MessageActions.sendMessage(channelId, { content: "Failed to upload Gary image :(" });
    }
}

export const GaryChatBarIcon: ChatBarButton = ({ isMainChat }) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const currentChannelId = SelectedChannelStore.getChannelId();

    const handleClick = async () => {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 1000);

        if (currentChannelId) {
            const link = await getUrl();
            if (settings.store.randomGarySendMethod === "link") {
                await sendGaryLink(currentChannelId, link);
            } else {
                await uploadGaryImage(link, currentChannelId);
            }
        }
    };

    const handleRightClick = async (e: React.MouseEvent) => {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 1000);

        if (currentChannelId) {
            const link = await getUrl();
            if (settings.store.randomGarySendMethod === "attachment") {
                await sendGaryLink(currentChannelId, link);
            } else {
                await uploadGaryImage(link, currentChannelId);
            }
        }
    };

    if (!isMainChat) return null;

    return (
        <ChatBarButton
            tooltip="Click for Gary"
            onClick={handleClick}
            onContextMenu={handleRightClick}
            buttonProps={{
                "aria-label": "Gary Button",
                className: classes(cl("chat-button"), isAnimating ? cl("animating") : "")
            }}
        >
            <GaryIcon />
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "RandomGary",
    description: "Adds a button to send a random Gary picture!",
    authors: [{ name: "Zach Orange", id: 683550738198036516n }],
    settings,
    start() {
        addChatBarButton("vc-gary", GaryChatBarIcon);
        const style = document.createElement("style");
        style.textContent = `
            .${cl("icon")} {
                transform-origin: center;
                display: inline-block;
                transition: transform 0.3s ease-in-out;
            }
            @keyframes garyBounceRotate {
                0%, 100% { transform: translateY(0) rotate(0deg); }
                15% { transform: translateY(-10px) rotate(20deg); }
                30% { transform: translateY(5px) rotate(-10deg); }
                45% { transform: translateY(-5px) rotate(5deg); }
                60% { transform: translateY(2px) rotate(-2deg); }
                75% { transform: translateY(-1px) rotate(1deg); }
                90% { transform: translateY(0) rotate(0deg); }
            }
            .${cl("chat-button")}.${cl("animating")} .${cl("icon")} {
                animation: garyBounceRotate 1s ease-in-out;
            }
            .${cl("chat-button")}:hover .${cl("icon")} {
                animation: garyHover 0.5s ease-in-out;
            }
            .${cl("chat-button")}.${cl("animating")}:hover .${cl("icon")} {
                animation: garyBounceRotate 1s ease-in-out;
            }
            @keyframes garyHover {
                0%, 100% { transform: rotate(0deg); }
                25% { transform: rotate(5deg); }
                75% { transform: rotate(-5deg); }
            }
        `;
        style.setAttribute("data-gary-style", "true");
        document.head.appendChild(style);
    },
    stop() {
        removeChatBarButton("vc-gary");
        const style = document.head.querySelector("style[data-gary-style]");
        if (style) style.remove();
    }
});

export async function getUrl() {
    const response = await fetch("https://garybot.dev/api/totalgarys");
    const { num: numImages } = await response.json();
    const urlBase = "https://cdn.garybot.dev/gary";
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const randomNumber = (array[0] % numImages) + 1;
    return `${urlBase}${randomNumber}.jpg`;
}
