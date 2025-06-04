import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Box, IconButton, Tooltip, Paper, Typography, Snackbar, Alert, Button } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

const MindMap = ({ data, enableDownload = false }) => {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [currentFolder, setCurrentFolder] = useState(null); // 현재 표시중인 폴더
  const [breadcrumb, setBreadcrumb] = useState([]); // 경로 추적
  
  // 현재 시점과 확대 정도를 저장하는 ref
  const currentViewRef = useRef({ transform: null });

  // 유틸리티 함수들 먼저 정의
  const truncateText = React.useCallback((text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  }, []);

  const formatFileSize = React.useCallback((bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const getMimeTypeDescription = React.useCallback((mimeType) => {
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
  }, []);

  const showFileDetails = React.useCallback((event, details) => {
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
  }, [formatFileSize, getMimeTypeDescription]);

  const downloadFile = React.useCallback((fileDetails) => {
    // 공개 접근 방식에서는 webViewLink를 통해 파일 접근
    if (fileDetails.webViewLink) {
      // Google Drive에서 제공하는 파일 보기 링크로 이동
      const viewUrl = fileDetails.webViewLink;
      
      // 새 탭에서 파일 열기
      const newWindow = window.open(viewUrl, '_blank', 'noopener,noreferrer');
      
      if (newWindow) {
        setNotification({
          open: true,
          message: `"${fileDetails.name}" 파일을 새 탭에서 열었습니다. Google Drive에서 다운로드할 수 있습니다.`,
          severity: 'info'
        });
      } else {
        setNotification({
          open: true,
          message: '팝업이 차단되었습니다. 브라우저 설정을 확인해주세요.',
          severity: 'warning'
        });
      }
    } else if (fileDetails.webContentLink) {
      // 직접 다운로드 링크가 있는 경우
      const downloadLink = document.createElement('a');
      downloadLink.href = fileDetails.webContentLink;
      downloadLink.target = '_blank';
      downloadLink.rel = 'noopener noreferrer';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      setNotification({
        open: true,
        message: `"${fileDetails.name}" 다운로드 중...`,
        severity: 'info'
      });
    } else {
      // 다운로드 링크가 없는 경우 파일 상세 정보 표시
      setNotification({
        open: true,
        message: `"${fileDetails.name}"은 공개 접근으로는 직접 다운로드할 수 없습니다. 파일 정보를 확인하세요.`,
        severity: 'warning'
      });
      
      // 파일 상세 정보 표시
      showFileDetails(null, fileDetails);
    }
  }, [showFileDetails]);

  // 폴더 탐색 함수
  const navigateToFolder = React.useCallback((folderNode) => {
    if (folderNode.data.type === 'folder') {
      setCurrentFolder(folderNode);
      setBreadcrumb(prev => [...prev, folderNode]);
    }
  }, []);

  // 상위 폴더로 이동
  const navigateUp = React.useCallback(() => {
    if (breadcrumb.length > 1) {
      const newBreadcrumb = breadcrumb.slice(0, -1);
      setBreadcrumb(newBreadcrumb);
      setCurrentFolder(newBreadcrumb[newBreadcrumb.length - 1]);
    } else if (breadcrumb.length === 1) {
      setBreadcrumb([]);
      setCurrentFolder(null);
    }
  }, [breadcrumb]);

  const handleNodeClick = React.useCallback(async (event, d) => {
    event.stopPropagation();
    
    // 안전한 데이터 접근
    const nodeData = d && d.data ? d.data : d;
    if (!nodeData) return;
    
    if (nodeData.type === 'folder') {
      // 폴더 클릭 시 해당 폴더로 탐색
      navigateToFolder(d);
    } else {
      // 파일 클릭 시 기존 로직
      try {
        const details = await window.getFileDetails(nodeData.id);
        
        if (enableDownload) {
          downloadFile(details);
        } else {
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
  }, [enableDownload, downloadFile, showFileDetails, navigateToFolder]);

  const handleMouseOver = React.useCallback((event, d) => {
    // 안전한 데이터 접근
    const nodeData = d && d.data ? d.data : d;
    if (!nodeData) return;
    
    // Show a simple tooltip
    const tooltip = d3.select(tooltipRef.current);
    tooltip
      .style('display', 'block')
      .style('left', (event.pageX + 15) + 'px')
      .style('top', (event.pageY - 10) + 'px')
      .html(`<div><strong>${nodeData.name || '알 수 없음'}</strong><br/>${getMimeTypeDescription(nodeData.mimeType)}</div>`);
  }, [getMimeTypeDescription]);

  const handleMouseOut = React.useCallback(() => {
    d3.select(tooltipRef.current)
      .style('display', 'none');
  }, []);

  const resetZoom = React.useCallback(() => {
    const svg = d3.select(svgRef.current);
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    const defaultTransform = d3.zoomIdentity.translate(width/2, height/2).scale(0.7);
    
    svg.transition()
      .duration(750)
      .call(
        d3.zoom().transform,
        defaultTransform
      );
      
    // 초기화된 변환 정보 저장
    currentViewRef.current.transform = defaultTransform;
  }, []);

  const zoomIn = React.useCallback(() => {
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
  }, []);

  const zoomOut = React.useCallback(() => {
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
  }, []);

  const handleCloseTooltip = React.useCallback(() => {
    setTooltip({ ...tooltip, visible: false });
  }, [tooltip]);

  const handleCloseNotification = React.useCallback((event, reason) => {
    if (reason === 'clickaway') return;
    setNotification({ ...notification, open: false });
  }, [notification]);

  // 초기화 - 데이터가 변경될 때 루트로 리셋
  useEffect(() => {
    if (data) {
      setCurrentFolder(null);
      setBreadcrumb([]);
    }
  }, [data]);

  const createMindMap = React.useCallback(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // 현재 표시할 데이터 결정
    const displayData = currentFolder || data;
    if (!displayData || !displayData.data) return;
    
    // 중앙 노드 데이터 준비
    const centralNodeData = {
      data: displayData.data,
      x: 0,
      y: 0,
      isCentral: true
    };
    
    // 자식 노드들 준비
    const children = displayData.children || [];
    const childNodes = children.map((child, index) => {
      const angle = (2 * Math.PI * index) / children.length - Math.PI / 2;
      const radius = Math.min(280, Math.max(180, children.length * 20)); // 더 넓은 간격
      
      return {
        data: child.data,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        isCentral: false,
        originalNode: child
      };
    });
    
    // 모든 노드 데이터
    const nodes = [centralNodeData, ...childNodes];
    
    // 링크 데이터
    const links = childNodes.map(child => ({
      source: { x: 0, y: 0 },
      target: { x: child.x, y: child.y }
    }));
    
    // 그라데이션 및 필터 정의
    const defs = svg.append('defs');
    
    // 중앙 노드용 그라데이션
    const centralGradient = defs.append('linearGradient')
      .attr('id', 'centralGradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '100%');
    centralGradient.append('stop')
      .attr('offset', '0%')
      .attr('style', 'stop-color:#4285F4;stop-opacity:1');
    centralGradient.append('stop')
      .attr('offset', '100%')
      .attr('style', 'stop-color:#1565C0;stop-opacity:1');
    
    // 폴더 노드용 그라데이션
    const folderGradient = defs.append('linearGradient')
      .attr('id', 'folderGradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '100%');
    folderGradient.append('stop')
      .attr('offset', '0%')
      .attr('style', 'stop-color:#FFC107;stop-opacity:1');
    folderGradient.append('stop')
      .attr('offset', '100%')
      .attr('style', 'stop-color:#FF8F00;stop-opacity:1');
    
    // 파일 노드용 그라데이션
    const fileGradient = defs.append('linearGradient')
      .attr('id', 'fileGradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '100%');
    fileGradient.append('stop')
      .attr('offset', '0%')
      .attr('style', 'stop-color:#4CAF50;stop-opacity:1');
    fileGradient.append('stop')
      .attr('offset', '100%')
      .attr('style', 'stop-color:#2E7D32;stop-opacity:1');
    
    // 드롭 섀도우 필터
    const filter = defs.append('filter')
      .attr('id', 'drop-shadow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    filter.append('feDropShadow')
      .attr('dx', 2)
      .attr('dy', 3)
      .attr('stdDeviation', 4)
      .attr('flood-color', 'rgba(0,0,0,0.2)');
    
    const g = svg.append('g');
    
    // 부드러운 줌 동작 정의
    const zoom = d3.zoom()
      .scaleExtent([0.3, 2])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        currentViewRef.current.transform = event.transform;
        
        // 줌 레벨에 따른 레이블 표시/숨김
        const scale = event.transform.k;
        g.selectAll('.node-card')
          .style('opacity', scale > 0.2 ? 1 : 0.7);
      });
    
    svg.call(zoom);
    
    // 초기 뷰 설정
    const initialTransform = d3.zoomIdentity.translate(width/2, height/2).scale(0.8);
    svg.call(zoom.transform, initialTransform);
    currentViewRef.current.transform = initialTransform;
    
    // 직선 연결선
    const linkElements = g.selectAll('.link')
      .data(links)
      .join('line')
      .attr('class', 'link')
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)
      .attr('stroke', '#E1E8ED')
      .attr('stroke-width', 2)
      .attr('opacity', 0);
    
    // 링크 애니메이션
    linkElements.transition()
      .duration(600)
      .attr('opacity', 0.4);
    
    // 노드 그룹 생성
    const nodeElements = g.selectAll('.node')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x}, ${d.y})`)
      .attr('opacity', 0)
      .style('cursor', 'pointer');
    
    // 카드형 배경 (중앙은 원형 유지, 나머지는 둥근 사각형)
    nodeElements.append('rect')
      .attr('class', 'node-card')
      .attr('rx', d => d.isCentral ? 30 : 8)
      .attr('ry', d => d.isCentral ? 30 : 8)
      .attr('width', d => {
        if (d.isCentral) return 60;
        const name = d.data && d.data.name ? d.data.name : '알 수 없음';
        // 아이콘 공간(30px) + 텍스트 공간 + 패딩(20px)을 고려한 최소 너비
        const textWidth = Math.min(name.length * 8, 120); // 텍스트 최대 120px
        return Math.max(110, textWidth + 50);
      })
      .attr('height', d => d.isCentral ? 60 : 40)
      .attr('x', d => {
        if (d.isCentral) return -30;
        const name = d.data && d.data.name ? d.data.name : '알 수 없음';
        const textWidth = Math.min(name.length * 8, 120);
        const width = Math.max(110, textWidth + 50);
        return -width / 2;
      })
      .attr('y', d => d.isCentral ? -30 : -20)
      .attr('fill', d => {
        if (d.isCentral) return 'url(#centralGradient)';
        const nodeType = d.data && d.data.type ? d.data.type : 'file';
        return nodeType === 'folder' ? 'url(#folderGradient)' : 'url(#fileGradient)';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('filter', 'url(#drop-shadow)');
    
    // 아이콘 (중앙 노드만)
    nodeElements.filter(d => d.isCentral)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 8)
      .attr('font-size', '28px')
      .attr('fill', '#fff')
      .text('🗂️');
    
    // 작은 아이콘 (자식 노드들)
    nodeElements.filter(d => !d.isCentral)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 2)
      .attr('x', d => {
        const name = d.data && d.data.name ? d.data.name : '알 수 없음';
        const textWidth = Math.min(name.length * 8, 120);
        const width = Math.max(110, textWidth + 50);
        return -width / 2 + 15;
      })
      .attr('font-size', '16px')
      .attr('fill', '#fff')
      .text(d => {
        const nodeType = d.data && d.data.type ? d.data.type : 'file';
        return nodeType === 'folder' ? '📁' : '📄';
      });
    
    // 텍스트 레이블
    const labels = nodeElements.append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', d => d.isCentral ? 'middle' : 'start')
      .attr('dy', d => d.isCentral ? 50 : 2)
      .attr('x', d => {
        if (d.isCentral) return 0;
        const name = d.data && d.data.name ? d.data.name : '알 수 없음';
        const textWidth = Math.min(name.length * 8, 120);
        const width = Math.max(110, textWidth + 50);
        return -width / 2 + 32;
      })
      .attr('font-size', d => d.isCentral ? '14px' : '12px')
      .attr('font-weight', d => d.isCentral ? 'bold' : 'normal')
      .attr('fill', d => d.isCentral ? '#2C3E50' : '#fff')
      .text(d => {
        const name = d.data && d.data.name ? d.data.name : '알 수 없음';
        if (d.isCentral) {
          return truncateText(name, 15);
        }
        // 자식 노드는 사용 가능한 텍스트 공간에 맞게 조절 (아이콘 공간 제외)
        const availableWidth = 120; // 최대 텍스트 너비
        const maxChars = Math.floor(availableWidth / 8); // 8px per char
        return truncateText(name, Math.min(maxChars, 15));
      });
    
    // 호버 이벤트
    nodeElements
      .on('click', (event, d) => {
        const nodeToPass = d.isCentral ? displayData : (d.originalNode || d);
        handleNodeClick(event, nodeToPass);
      })
      .on('mouseover', (event, d) => {
        // 전체 이름을 툴팁으로 표시
        const fullName = d.data && d.data.name ? d.data.name : '알 수 없음';
        handleMouseOver(event, d);
        
        // 호버 효과
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr('transform', `translate(${d.x}, ${d.y}) scale(1.05)`);
        
        // 카드 밝기 증가
        d3.select(event.currentTarget).select('.node-card')
          .transition()
          .duration(200)
          .style('filter', 'url(#drop-shadow) brightness(1.1)');
      })
      .on('mouseout', (event, d) => {
        handleMouseOut();
        
        // 호버 해제 효과
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr('transform', `translate(${d.x}, ${d.y}) scale(1)`);
        
        // 카드 원래 밝기로
        d3.select(event.currentTarget).select('.node-card')
          .transition()
          .duration(200)
          .style('filter', 'url(#drop-shadow)');
      });
    
    // 노드 출현 애니메이션
    nodeElements.transition()
      .duration(500)
      .delay((d, i) => i * 80)
      .attr('opacity', 1)
      .ease(d3.easeBackOut);
    
  }, [data, currentFolder, handleNodeClick, handleMouseOver, handleMouseOut, truncateText]);

  useEffect(() => {
    if (!data) return;
    
    createMindMap();
    
    // Cleanup on component unmount
    return () => {
      const currentSvg = svgRef.current;
      if (currentSvg) {
        d3.select(currentSvg).selectAll('*').remove();
      }
    };
  }, [data, createMindMap]);

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* 경로 표시 및 뒤로가기 버튼 */}
      {breadcrumb.length > 0 && (
        <Box 
          sx={{ 
            position: 'absolute', 
            top: 20, 
            left: 20, 
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            padding: '12px 16px',
            borderRadius: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            maxWidth: '60%',
            flexWrap: 'wrap'
          }}
        >
          <IconButton 
            size="small" 
            onClick={navigateUp}
            sx={{ 
              backgroundColor: '#4285F4',
              color: 'white',
              width: 32,
              height: 32,
              '&:hover': { backgroundColor: '#1565C0' }
            }}
          >
            <RestartAltIcon style={{ transform: 'rotate(180deg)', fontSize: '18px' }} />
          </IconButton>
          
          {/* 루트 폴더 버튼 */}
          <Button
            size="small"
            variant="text"
            onClick={() => {
              setBreadcrumb([]);
              setCurrentFolder(null);
            }}
            sx={{
              minWidth: 'auto',
              padding: '4px 8px',
              color: breadcrumb.length === 1 ? '#4285F4' : '#666',
              fontWeight: breadcrumb.length === 1 ? 'bold' : 'normal',
              '&:hover': { backgroundColor: 'rgba(66, 133, 244, 0.1)' }
            }}
          >
            🏠 루트
          </Button>
          
          {/* 각 폴더 경로 버튼들 */}
          {breadcrumb.map((folder, index) => (
            <React.Fragment key={folder.data.id}>
              <Typography variant="body2" sx={{ color: '#999', mx: 0.5 }}>
                /
              </Typography>
              <Button
                size="small"
                variant="text"
                onClick={() => {
                  // 해당 폴더로 바로 이동
                  const newBreadcrumb = breadcrumb.slice(0, index + 1);
                  setBreadcrumb(newBreadcrumb);
                  setCurrentFolder(folder);
                }}
                sx={{
                  minWidth: 'auto',
                  padding: '4px 8px',
                  color: index === breadcrumb.length - 1 ? '#4285F4' : '#666',
                  fontWeight: index === breadcrumb.length - 1 ? 'bold' : 'normal',
                  maxWidth: '120px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  '&:hover': { backgroundColor: 'rgba(66, 133, 244, 0.1)' }
                }}
                title={folder.data.name} // 전체 이름 툴팁
              >
                📁 {truncateText(folder.data.name, 10)}
              </Button>
            </React.Fragment>
          ))}
          
          {breadcrumb.length > 1 && (
            <Typography 
              variant="caption" 
              sx={{ 
                color: '#999', 
                ml: 1,
                backgroundColor: 'rgba(0,0,0,0.05)',
                padding: '2px 6px',
                borderRadius: '8px'
              }}
            >
              {breadcrumb.length}단계 깊이
            </Typography>
          )}
        </Box>
      )}

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