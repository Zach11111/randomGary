import definePlugin from "@utils/types";
import { addChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { addButton, removeButton } from "@api/MessagePopover";
import { ChatBarButton } from "@api/ChatButtons";
import { classes } from "@utils/misc";
import { useEffect, useState, MessageActions, ChannelStore, Menu, SelectedChannelStore } from "@webpack/common";
import { classNameFactory } from "@api/Styles";

const cl = classNameFactory("vc-gary-");

export function GaryIcon({ height = 24, width = 24, className }: { height?: number; width?: number; className?: string; }) {
    return (
        <svg
            viewBox="0 0 24 24"
            height={height}
            width={width}
            className={classes(cl("icon"), className)}
        >
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
        </svg>
    );
}

export const GaryChatBarIcon: ChatBarButton = ({ isMainChat }) => {
    const handleClick = () => {
        const currentChannelId = SelectedChannelStore.getChannelId();
        if (currentChannelId) {
            const message = GetGary()
            MessageActions.sendMessage(currentChannelId, { content: message });
            console.log('gary');
        } else {
            console.error('No current channel found');
        }
    };

    if (!isMainChat) return null;

    return (
        <ChatBarButton
            tooltip="Click for Gary"
            onClick={handleClick}
            buttonProps={{
                "aria-label": "Gary Button"
            }}
        >
            <GaryIcon className={cl("chat-button")} />
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "RandomGary",
    description: "Adds a button to send a random gary picture!",
    authors: [{ name: "Zach Orange", id: 683550738198036516n }],
    start() {
        addChatBarButton("vc-gary", GaryChatBarIcon);
        addButton("vc-gary", message => {
            return {
                label: "Gary",
                icon: GaryIcon,
                message,
                channel: ChannelStore.getChannel(message.channel_id),
                onClick: async () => {
                }
            };
        });
    },
    stop() {
        removeChatBarButton("vc-gary");
        removeButton("vc-gary");
    }
});

export function GetGary() {
    const urlBase = 'https://cdn.garybot.dev/gary';
    const randomNumber = Math.floor(Math.random() * 532) + 1;
    const url = `${urlBase}${randomNumber}.jpg`
    return url;
  }