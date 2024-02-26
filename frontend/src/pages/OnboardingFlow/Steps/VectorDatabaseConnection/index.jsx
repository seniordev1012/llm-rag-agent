import React, { useEffect, useState, useRef } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import ChromaLogo from "@/media/vectordbs/chroma.png";
import PineconeLogo from "@/media/vectordbs/pinecone.png";
import LanceDbLogo from "@/media/vectordbs/lancedb.png";
import WeaviateLogo from "@/media/vectordbs/weaviate.png";
import QDrantLogo from "@/media/vectordbs/qdrant.png";
import MilvusLogo from "@/media/vectordbs/milvus.png";
import ZillizLogo from "@/media/vectordbs/zilliz.png";
import AstraDBLogo from "@/media/vectordbs/astraDB.png";
import System from "@/models/system";
import paths from "@/utils/paths";
import PineconeDBOptions from "@/components/VectorDBSelection/PineconeDBOptions";
import ChromaDBOptions from "@/components/VectorDBSelection/ChromaDBOptions";
import QDrantDBOptions from "@/components/VectorDBSelection/QDrantDBOptions";
import WeaviateDBOptions from "@/components/VectorDBSelection/WeaviateDBOptions";
import LanceDBOptions from "@/components/VectorDBSelection/LanceDBOptions";
import MilvusOptions from "@/components/VectorDBSelection/MilvusDBOptions";
import ZillizCloudOptions from "@/components/VectorDBSelection/ZillizCloudOptions";
import AstraDBOptions from "@/components/VectorDBSelection/AstraDBOptions";
import showToast from "@/utils/toast";
import { useNavigate } from "react-router-dom";
import VectorDBItem from "@/components/VectorDBSelection/VectorDBItem";

const TITLE = "Vector Database Connection";
const DESCRIPTION =
  "These are the credentials and settings for your vector database of choice.";

export default function VectorDatabaseConnection({
  setHeader,
  setForwardBtn,
  setBackBtn,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredVDBs, setFilteredVDBs] = useState([]);
  const [selectedVDB, setSelectedVDB] = useState(null);
  const [settings, setSettings] = useState(null);
  const formRef = useRef(null);
  const hiddenSubmitButtonRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchKeys() {
      const _settings = await System.keys();
      setSettings(_settings);
      setSelectedVDB(_settings?.VectorDB || "lancedb");
    }
    fetchKeys();
  }, []);

  const VECTOR_DBS = [
    {
      name: "LanceDB",
      value: "lancedb",
      logo: LanceDbLogo,
      options: <LanceDBOptions />,
      description:
        "100% local vector DB that runs on the same instance as AnythingLLM.",
    },
    {
      name: "Chroma",
      value: "chroma",
      logo: ChromaLogo,
      options: <ChromaDBOptions settings={settings} />,
      description:
        "Open source vector database you can host yourself or on the cloud.",
    },
    {
      name: "Pinecone",
      value: "pinecone",
      logo: PineconeLogo,
      options: <PineconeDBOptions settings={settings} />,
      description: "100% cloud-based vector database for enterprise use cases.",
    },
    {
      name: "Zilliz Cloud",
      value: "zilliz",
      logo: ZillizLogo,
      options: <ZillizCloudOptions settings={settings} />,
      description:
        "Cloud hosted vector database built for enterprise with SOC 2 compliance.",
    },
    {
      name: "QDrant",
      value: "qdrant",
      logo: QDrantLogo,
      options: <QDrantDBOptions settings={settings} />,
      description: "Open source local and distributed cloud vector database.",
    },
    {
      name: "Weaviate",
      value: "weaviate",
      logo: WeaviateLogo,
      options: <WeaviateDBOptions settings={settings} />,
      description:
        "Open source local and cloud hosted multi-modal vector database.",
    },
    {
      name: "Milvus",
      value: "milvus",
      logo: MilvusLogo,
      options: <MilvusOptions settings={settings} />,
      description: "Open-source, highly scalable, and blazing fast.",
    },
    {
      name: "AstraDB",
      value: "astra",
      logo: AstraDBLogo,
      options: <AstraDBOptions settings={settings} />,
      description: "Vector Search for Real-world GenAI.",
    },
  ];

  function handleForward() {
    if (hiddenSubmitButtonRef.current) {
      hiddenSubmitButtonRef.current.click();
    }
  }

  function handleBack() {
    navigate(paths.onboarding.embeddingPreference());
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {};
    const formData = new FormData(form);
    data.VectorDB = selectedVDB;
    for (var [key, value] of formData.entries()) data[key] = value;
    const { error } = await System.updateSystem(data);
    if (error) {
      showToast(`Failed to save Vector Database settings: ${error}`, "error");
      return;
    }
    navigate(paths.onboarding.customLogo());
  };

  useEffect(() => {
    setHeader({ title: TITLE, description: DESCRIPTION });
    setForwardBtn({ showing: true, disabled: false, onClick: handleForward });
    setBackBtn({ showing: true, disabled: false, onClick: handleBack });
  }, []);

  useEffect(() => {
    const filtered = VECTOR_DBS.filter((vdb) =>
      vdb.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredVDBs(filtered);
  }, [searchQuery, selectedVDB]);

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} className="w-full">
        <div className="w-full relative border-slate-300/40 shadow border-2 rounded-lg text-white pb-4">
          <div className="w-full p-4 absolute top-0 rounded-t-lg backdrop-blur-sm">
            <div className="w-full flex items-center sticky top-0 z-20">
              <MagnifyingGlass
                size={16}
                weight="bold"
                className="absolute left-4 z-30 text-white"
              />
              <input
                type="text"
                placeholder="Search vector databases"
                className="bg-zinc-600 z-20 pl-10 h-[38px] rounded-full w-full px-4 py-1 text-sm border-2 border-slate-300/40 outline-none focus:border-white text-white"
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault();
                }}
              />
            </div>
          </div>
          <div className="px-4 pt-[70px] flex flex-col gap-y-1 max-h-[390px] overflow-y-auto no-scroll">
            {filteredVDBs.map((vdb) => (
              <VectorDBItem
                key={vdb.name}
                name={vdb.name}
                value={vdb.value}
                image={vdb.logo}
                description={vdb.description}
                checked={selectedVDB === vdb.value}
                onClick={setSelectedVDB}
              />
            ))}
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-y-1">
          {selectedVDB &&
            VECTOR_DBS.find((vdb) => vdb.value === selectedVDB)?.options}
        </div>
        <button
          type="submit"
          ref={hiddenSubmitButtonRef}
          hidden
          aria-hidden="true"
        ></button>
      </form>
    </>
  );
}
