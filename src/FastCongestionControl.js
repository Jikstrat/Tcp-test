import React, { useState, useEffect, useCallback } from 'react';

const FastCongestionControl = ({ nodes, setNodes, selectedNodeId, onUpdateNetwork }) => {
  const [duplicateAcks, setDuplicateAcks] = useState(0);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const DUPLICATE_ACK_THRESHOLD = 3; // Threshold for fast retransmit

  // Cache the current node for efficiency
  const currentNode = nodes[selectedNodeId];

  const handleFastRetransmit = useCallback(() => {
    if (currentNode && !recoveryMode) {
      console.log('Fast Retransmit triggered');
      const updatedNode = { ...currentNode, cwnd: 1 }; // Reset congestion window after retransmit
      setNodes(prevNodes => {
        const newNodes = [...prevNodes];
        newNodes[selectedNodeId] = updatedNode;
        return newNodes; // Update node data
      });
      setRecoveryMode(true); // Enter recovery mode
      setDuplicateAcks(0); // Reset duplicate ACK counter
      onUpdateNetwork(); // Update the network metrics after retransmit
    }
  }, [currentNode, recoveryMode, setNodes, selectedNodeId, onUpdateNetwork]);

  const handleFastRecovery = useCallback(() => {
    if (currentNode && recoveryMode) {
      console.log('Fast Recovery mode');
      const newCwnd = Math.max(currentNode.cwnd / 2, 1); // Reduce congestion window by half
      const updatedNode = { ...currentNode, cwnd: newCwnd };
      setNodes(prevNodes => {
        const newNodes = [...prevNodes];
        newNodes[selectedNodeId] = updatedNode;
        return newNodes; // Update node data
      });
      setRecoveryMode(false); // Exit recovery mode
      onUpdateNetwork(); // Update network metrics after recovery
    }
  }, [currentNode, recoveryMode, setNodes, selectedNodeId, onUpdateNetwork]);

  useEffect(() => {
    if (!currentNode) return;

    // Detect if duplicate ACK received
    const lastSentPacket = currentNode.sent[currentNode.sent.length - 1];
    if (currentNode.ack === lastSentPacket) {
      setDuplicateAcks(prevAcks => {
        // Only increment if not in recovery mode
        return recoveryMode ? prevAcks : Math.min(prevAcks + 1, DUPLICATE_ACK_THRESHOLD + 1); // cap to avoid excess
      });
    } else {
      // If ACK does not match the last sent packet, reset duplicate ACKs
      setDuplicateAcks(0);
    }
  }, [currentNode, recoveryMode]);

  useEffect(() => {
    if (duplicateAcks >= DUPLICATE_ACK_THRESHOLD && !recoveryMode) {
      handleFastRetransmit();
    }

    if (recoveryMode) {
      handleFastRecovery();
    }

  }, [duplicateAcks, recoveryMode, handleFastRetransmit, handleFastRecovery]);

  return (
    <div>
      <h4>Fast Congestion Control (Fast Retransmit + Fast Recovery)</h4>
      <p>Duplicate ACKs: {duplicateAcks}</p>
      <p>Recovery Mode: {recoveryMode ? 'Active' : 'Inactive'}</p>
    </div>
  );
};

export default FastCongestionControl;
