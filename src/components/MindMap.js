import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Box, IconButton, Tooltip, Paper, Typography, Snackbar, Alert } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import { getFileDetails } from '../services/googleDriveService';

const MindMap = ({ data, enableDownload = false }) => {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [tooltipContent, setTooltipContent] = useState('');
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  // 디지털선도학교 로고 이미지 경로
  const digitalSchoolLogoPath = '/images/digital_school_logo.png';
  // 현재 시점과 확대 정도를 저장하는 ref
  const currentViewRef = useRef({ transform: null });

  useEffect(() => {
    if (!data) return;
    
    createMindMap();
    
    // Cleanup on component unmount
    return () => {
      d3.select(svgRef.current).selectAll('*').remove();
    };
  }, [data]);

  const createMindMap = () => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    const g = svg.append('g')
      .attr('transform', `translate(${width/2},${height/2})`);
    
    // Define zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        // 현재 변환 정보 저장
        currentViewRef.current.transform = event.transform;
      });
    
    svg.call(zoom);
    
    // 저장된 변환 정보가 있으면 적용, 없으면 초기 상태로 설정
    if (currentViewRef.current.transform) {
      svg.call(zoom.transform, currentViewRef.current.transform);
    } else {
      svg.call(zoom.transform, d3.zoomIdentity.translate(width/2, height/2).scale(0.8));
    }
    
    // Create radial layout
    const radius = Math.min(width, height) / 2 - 120;
    
    // Create hierarchy from data
    const root = d3.hierarchy(data);
    
    // Define custom layout (similar to radial but with modifications)
    const layout = d3.cluster()
      .size([360, radius]);
    
    // Apply layout
    layout(root);
    
    // Add links
    const linkGenerator = d3.linkRadial()
      .angle(d => d.x * Math.PI / 180)
      .radius(d => d.y);
    
    g.selectAll('.link')
      .data(root.links())
      .join('path')
      .attr('class', 'link')
      .attr('d', linkGenerator)
      .attr('fill', 'none')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 1.5);
    
    // Add nodes
    const nodes = g.selectAll('.node')
      .data(root.descendants())
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => `rotate(${d.x - 90}) translate(${d.y})`)
      .attr('cursor', 'pointer')
      .on('click', (event, d) => handleNodeClick(event, d))
      .on('mouseover', (event, d) => handleMouseOver(event, d))
      .on('mouseout', () => handleMouseOut());
    
    // Add node circles
    nodes.append('circle')
      .attr('r', d => d.depth === 0 ? 25 : d.data.type === 'folder' ? 15 : 8)
      .attr('class', d => {
        if (d.depth === 0) return 'central-node';
        return d.data.type === 'folder' ? 'folder-node' : 'file-node';
      })
      .attr('fill', d => {
        if (d.depth === 0) return '#8B4513';
        return d.data.type === 'folder' ? '#FFD700' : '#fff';
      })
      .attr('stroke', d => {
        if (d.depth === 0) return '#8B4513';
        return d.data.type === 'folder' ? '#DAA520' : '#2E8B57';
      })
      .attr('stroke-width', 1.5);
    
    // 디지털선도학교 로고를 중앙 노드와 폴더 노드에 추가
    nodes.filter(d => d.depth === 0)
      .each(function(d) {
        const node = d3.select(this);
        
        // 디지털선도학교 로고 이미지 추가
        node.append('image')
          .attr('xlink:href', digitalSchoolLogoPath)
          .attr('width', 30)
          .attr('height', 30)
          .attr('x', -15)
          .attr('y', -15)
          .attr('transform', d => `rotate(${90 - d.x})`)
          .style('pointer-events', 'none');
      });
    
    // 폴더 노드에 아이콘 추가 (중앙 노드 제외)
    nodes.filter(d => d.data.type === 'folder' && d.depth !== 0)
      .append('text')
      .attr('dy', 5)
      .attr('text-anchor', 'middle')
      .attr('transform', d => `rotate(${90 - d.x})`)
      .html('📁');
    
    // 파일 노드에 아이콘 추가
    nodes.filter(d => d.data.type === 'file')
      .append('text')
      .attr('dy', 4)
      .attr('text-anchor', 'middle')
      .attr('transform', d => `rotate(${90 - d.x})`)
      .html('📄');
    
    // Add labels
    nodes.append('text')
      .attr('dy', d => d.depth === 0 ? -35 : d.data.type === 'folder' ? -20 : -15)
      .attr('text-anchor', 'middle')
      .attr('transform', d => `rotate(${90 - d.x})`)
      .text(d => truncateText(d.data.name, 20))
      .attr('fill', '#333')
      .attr('font-size', d => d.depth === 0 ? '16px' : '12px')
      .attr('font-weight', d => d.depth === 0 ? 'bold' : 'normal');
  };

  const handleNodeClick = async (event, d) => {
    event.stopPropagation();
    
    setSelectedNode(d);
    
    // 파일 노드인 경우
    if (d.data.type === 'file') {
      try {
        const details = await getFileDetails(d.data.id);
        
        if (enableDownload) {
          // 다운로드 처리
          downloadFile(details);
        } else {
          // 기존 방식: 상세 정보 표시
          showFileDetails(event, details);
        }
      } catch (error) {
        console.error('파일 정보를 가져오는 중 오류 발생:', error);
        setNotification({
          open: true,
          message: '파일 정보를 가져오는 중 오류가 발생했습니다.',
          severity: 'error'
        });
      }
    }
  };

  const downloadFile = (fileDetails) => {
    if (!fileDetails.webContentLink && !fileDetails.webViewLink) {
      // 구글 문서 형식인 경우 내보내기 URL 생성
      if (fileDetails.mimeType.includes('google-apps')) {
        let exportMimeType = '';
        let exportExt = '';
        
        // 각 구글 문서 타입에 맞는 내보내기 형식 지정
        if (fileDetails.mimeType.includes('document')) {
          exportMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          exportExt = 'docx';
        } else if (fileDetails.mimeType.includes('spreadsheet')) {
          exportMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          exportExt = 'xlsx';
        } else if (fileDetails.mimeType.includes('presentation')) {
          exportMimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
          exportExt = 'pptx';
        } else if (fileDetails.mimeType.includes('drawing')) {
          exportMimeType = 'image/png';
          exportExt = 'png';
        } else {
          exportMimeType = 'application/pdf';
          exportExt = 'pdf';
        }
        
        // 내보내기 URL
        const exportUrl = `https://www.googleapis.com/drive/v3/files/${fileDetails.id}/export?mimeType=${encodeURIComponent(exportMimeType)}`;
        
        // 액세스 토큰 가져오기
        const token = window.gapi.client.getToken();
        if (token) {
          // 다운로드 링크 생성 및 클릭
          const downloadLink = document.createElement('a');
          downloadLink.href = exportUrl + '&alt=media&access_token=' + token.access_token;
          downloadLink.download = `${fileDetails.name}.${exportExt}`;
          downloadLink.target = '_blank';
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          
          setNotification({
            open: true,
            message: `"${fileDetails.name}" 다운로드 중...`,
            severity: 'info'
          });
        } else {
          setNotification({
            open: true,
            message: '인증 토큰이 없어 다운로드할 수 없습니다.',
            severity: 'error'
          });
        }
      } else {
        setNotification({
          open: true,
          message: '이 파일은 다운로드 링크가 제공되지 않습니다.',
          severity: 'warning'
        });
        // 대신 상세 정보 표시
        showFileDetails(null, fileDetails);
      }
    } else {
      // 직접 다운로드 링크가 있는 경우
      const downloadUrl = fileDetails.webContentLink || fileDetails.webViewLink;
      
      // 다운로드 링크 클릭
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.target = '_blank';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      setNotification({
        open: true,
        message: `"${fileDetails.name}" 다운로드 중...`,
        severity: 'info'
      });
    }
  };

  const showFileDetails = (event, details) => {
    // 파일 크기 포맷
    const size = details.size ? formatFileSize(details.size) : 'N/A';
    
    // 날짜 포맷
    const modified = details.modifiedTime ? new Date(details.modifiedTime).toLocaleString() : 'N/A';
    const created = details.createdTime ? new Date(details.createdTime).toLocaleString() : 'N/A';
    
    // 툴팁 콘텐츠 설정
    const content = `
      <div>
        <h3>${details.name}</h3>
        <p><strong>유형:</strong> ${getMimeTypeDescription(details.mimeType)}</p>
        <p><strong>크기:</strong> ${size}</p>
        <p><strong>수정됨:</strong> ${modified}</p>
        <p><strong>생성됨:</strong> ${created}</p>
        ${details.webViewLink ? `<p><a href="${details.webViewLink}" target="_blank" rel="noopener noreferrer">파일 열기</a></p>` : ''}
      </div>
    `;
    
    // 위치 설정
    const x = event ? event.pageX : window.innerWidth / 2;
    const y = event ? event.pageY : window.innerHeight / 2;
    
    // 툴팁 표시
    setTooltip({
      visible: true,
      x: x,
      y: y,
      content: content
    });
  };

  const handleMouseOver = (event, d) => {
    // Show a simple tooltip
    const tooltip = d3.select(tooltipRef.current);
    tooltip
      .style('display', 'block')
      .style('left', (event.pageX + 15) + 'px')
      .style('top', (event.pageY - 10) + 'px')
      .html(`<div><strong>${d.data.name}</strong><br/>${getMimeTypeDescription(d.data.mimeType)}</div>`);
  };

  const handleMouseOut = () => {
    d3.select(tooltipRef.current)
      .style('display', 'none');
  };

  const resetZoom = () => {
    const svg = d3.select(svgRef.current);
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    const defaultTransform = d3.zoomIdentity.translate(width/2, height/2).scale(0.8);
    
    svg.transition()
      .duration(750)
      .call(
        d3.zoom().transform,
        defaultTransform
      );
      
    // 초기화된 변환 정보 저장
    currentViewRef.current.transform = defaultTransform;
  };

  const zoomIn = () => {
    const svg = d3.select(svgRef.current);
    
    // 현재 변환 정보
    const currentTransform = currentViewRef.current.transform || d3.zoomIdentity;
    // 새로운 변환 정보 계산
    const newTransform = currentTransform.scale(1.3);
    
    svg.transition()
      .duration(300)
      .call(
        d3.zoom().transform,
        newTransform
      );
      
    // 업데이트된 변환 정보 저장
    currentViewRef.current.transform = newTransform;
  };

  const zoomOut = () => {
    const svg = d3.select(svgRef.current);
    
    // 현재 변환 정보
    const currentTransform = currentViewRef.current.transform || d3.zoomIdentity;
    // 새로운 변환 정보 계산
    const newTransform = currentTransform.scale(1 / 1.3);
    
    svg.transition()
      .duration(300)
      .call(
        d3.zoom().transform,
        newTransform
      );
      
    // 업데이트된 변환 정보 저장
    currentViewRef.current.transform = newTransform;
  };

  const handleCloseTooltip = () => {
    setTooltip({ ...tooltip, visible: false });
  };

  const handleCloseNotification = (event, reason) => {
    if (reason === 'clickaway') return;
    setNotification({ ...notification, open: false });
  };

  const truncateText = (text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getMimeTypeDescription = (mimeType) => {
    if (!mimeType) return '알 수 없는 유형';
    
    if (mimeType.includes('folder')) return '폴더';
    
    const mimeMap = {
      'application/vnd.google-apps.document': '구글 문서',
      'application/vnd.google-apps.spreadsheet': '구글 스프레드시트',
      'application/vnd.google-apps.presentation': '구글 프레젠테이션',
      'application/vnd.google-apps.form': '구글 설문지',
      'application/vnd.google-apps.drawing': '구글 드로잉',
      'application/pdf': 'PDF 문서',
      'image/jpeg': 'JPEG 이미지',
      'image/png': 'PNG 이미지',
      'text/plain': '텍스트 파일',
      'text/html': 'HTML 파일',
      'application/zip': 'ZIP 압축파일',
      'video/mp4': 'MP4 비디오',
      'audio/mpeg': 'MP3 오디오'
    };
    
    return mimeMap[mimeType] || mimeType;
  };

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      <svg ref={svgRef} width="100%" height="100%" style={{ background: 'transparent' }}></svg>
      
      <div 
        ref={tooltipRef} 
        className="tooltip" 
        style={{ 
          display: 'none',
          position: 'absolute',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '5px 10px',
          borderRadius: '5px',
          fontSize: '12px',
          pointerEvents: 'none',
          zIndex: 100
        }}
      ></div>
      
      {tooltip.visible && (
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            left: tooltip.x + 15,
            top: tooltip.y - 10,
            p: 2,
            maxWidth: 300,
            zIndex: 1000,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}
          onClick={handleCloseTooltip}
        >
          <div dangerouslySetInnerHTML={{ __html: tooltip.content }} />
          <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 1 }}>
            클릭하여 닫기
          </Typography>
        </Paper>
      )}
      
      <Snackbar
        open={notification.open}
        autoHideDuration={3000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>
      
      <Box className="zoom-controls">
        <Tooltip title="확대">
          <IconButton onClick={zoomIn} className="zoom-button" size="large">
            <ZoomInIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="축소">
          <IconButton onClick={zoomOut} className="zoom-button" size="large">
            <ZoomOutIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="기본 보기">
          <IconButton onClick={resetZoom} className="zoom-button" size="large">
            <RestartAltIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default MindMap; 