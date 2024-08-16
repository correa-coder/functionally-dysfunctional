/**
 * Given the track seconds, format it as minutes:seconds with padded 0 when necessary
 * @param seconds number
 * @returns string
 */
export function formatTrackDuration(totalSeconds) {
    let minutes = Math.floor(totalSeconds / 60);
    let remainingSeconds = Math.floor(totalSeconds % 60);

    // pad minutes and seconds
    minutes = minutes < 10 ? "0" + minutes : minutes;
    remainingSeconds =
        remainingSeconds < 10 ? "0" + remainingSeconds : remainingSeconds;

    return `${minutes}:${remainingSeconds}`;
}

export const Color = { WHITE: 0xffffff, BLACK: 0x000000, GRAY: 0xcccccc };
