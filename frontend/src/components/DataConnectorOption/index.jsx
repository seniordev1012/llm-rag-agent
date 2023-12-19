import paths from "@/utils/paths";
import ConnectorImages from "./media";

export default function DataConnectorOption({ slug }) {
  if (!DATA_CONNECTORS.hasOwnProperty(slug)) return null;
  const { path, image, name, description, link } = DATA_CONNECTORS[slug];

  return (
    <a href={path}>
      <label className="transition-all duration-300 inline-flex flex-col h-full w-60 cursor-pointer items-start justify-between rounded-2xl bg-preference-gradient border-2 border-transparent shadow-md px-5 py-4 text-white hover:bg-selected-preference-gradient hover:border-white/60 peer-checked:border-white peer-checked:border-opacity-90 peer-checked:bg-selected-preference-gradient">
        <div className="flex items-center">
          <img src={image} alt={name} className="h-10 w-10 rounded" />
          <div className="ml-4 text-sm font-semibold">{name}</div>
        </div>
        <div className="mt-2 text-xs font-base text-white tracking-wide">
          {description}
        </div>
        <a
          href={link}
          target="_blank"
          className="mt-2 text-xs text-white font-medium underline"
        >
          {link}
        </a>
      </label>
    </a>
  );
}

export const DATA_CONNECTORS = {
  github: {
    name: "GitHub Repo",
    path: paths.settings.dataConnectors.github(),
    image: ConnectorImages.github,
    description:
      "Import an entire public or private Github repository in a single click.",
    link: "https://github.com",
  },
  "youtube-transcript": {
    name: "YouTube Transcript",
    path: paths.settings.dataConnectors.youtubeTranscript(),
    image: ConnectorImages.youtube,
    description:
      "Import the transcription of an entire YouTube video from a link.",
    link: "https://youtube.com",
  },
};
