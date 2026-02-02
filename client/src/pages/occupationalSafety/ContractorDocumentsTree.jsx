import { useMemo } from "react";
import { Tree } from "antd";

const ContractorDocumentsTree = ({ contractorTree, renderTreeTitle }) => {
  const treeData = useMemo(() => {
    return (contractorTree || []).map((node) => {
      const mapNode = (item) => ({
        key: item.key,
        title: renderTreeTitle(item),
        children: item.children?.map(mapNode),
      });
      return mapNode(node);
    });
  }, [contractorTree, renderTreeTitle]);

  return <Tree blockNode showLine defaultExpandAll treeData={treeData} />;
};

export default ContractorDocumentsTree;
