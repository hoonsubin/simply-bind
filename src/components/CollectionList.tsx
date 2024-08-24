import { DocumentItem } from "../types";
import CollectionItem from './CollectionItem';

type CollectionListProps = {
  collections: DocumentItem[];
};

const CollectionList: React.FC<CollectionListProps> = ({
  collections,
}) => {
  return (
    <>
      {collections.length > 0 ? (
        <ul>
          {collections.map((file, index) => (
            <CollectionItem collection={file} key={index} />
          ))}
        </ul>
      ) : (
        <h1>No collection</h1>
      )}
    </>
  );
};

export default CollectionList;
