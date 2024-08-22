import React from 'react';
import { Tooltip } from 'nr1';

const ConditionTimeline = ({timeline, timeRange}) => {
  const start = new Date(Date.now() - timeRange.duration);
  const end = new Date(Date.now());

  const generateTimeChunks = (format) => {
    let allChunks = [];
    let chunk = null;
    let type = null;
    let endCopy = end;

    //1 day or less
    if (timeRange?.duration <= 86400000) {
      type = 'hour';
      chunk = 120*60*1000; //2 hour chunks
    } else if (timeRange?.duration > 86400000 && timeRange?.duration <= 1209600000) {
      type='day';
      chunk = 1000*60*60*24; //1 day chunks
    } else {
      type='week';
      chunk = 1000*60*60*24*7 //1 week chunks
    }

    for (let t=start.getTime(); t<end.getTime(); t+=chunk) {
      if (format == 'unix') {
        allChunks.push(t);
      } else {
        const tDate = new Date(t);
        tDate.setMinutes(0);
        allChunks.push(tDate.toLocaleTimeString([], {month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'}));
      }
    }

    //now
    if (format == 'unix') {
      allChunks.push(endCopy.getTime());
    } else {
      allChunks.push(endCopy.toLocaleTimeString([], {month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'}));
    }

    return allChunks;
  }

  const getTimeChunkPositions = () => {
    const timeChunks = generateTimeChunks('unix');
    let chunkLengths = [];

    let tcPos = 0;
    for (let c=0; c<timeChunks.length; c++) {
      tcPos = (c/(timeChunks.length - 1))*100

      if (c == 0) {
        tcPos = 1;
      }

      if (c+1 === timeChunks.length) {
        tcPos = 98;
      }

      chunkLengths.push({'timestamp': timeChunks[c], 'position': tcPos});
    }

    return chunkLengths;
  }

  const calculateXPosition = (ts) => {
    const timeChunkLengths = getTimeChunkPositions();

    let xPos = 0;
    for (let x=0; x<timeChunkLengths.length-1; x++) {
      const chunkStart = timeChunkLengths[x];
      const chunkEnd = timeChunkLengths[x + 1];

      if (ts < chunkStart) {
        xPos = 1;
        break;
      }

      if (ts == chunkEnd) {
        xPos = 98;
        break;
      }

      if (ts >= chunkStart.timestamp && ts < chunkEnd.timestamp) {
        const chunkLength = chunkEnd.timestamp - chunkStart.timestamp;
        const posRatio = (ts - chunkStart.timestamp) / chunkLength;
        xPos = chunkStart.position + posRatio * (chunkEnd.position - chunkStart.position);
        break;
      }
    }

    return xPos;

    //return Math.min(Math.max(((ts - start.getTime()) / (end.getTime() - start.getTime()))*100 + OFFSET, 1), 98); //old logic

  }

  const renderMarker = (type, timestamp) => {
    let position = calculateXPosition(timestamp);
    //let boundPosition = Math.min(Math.max(position, 1), 98);
    let style = '';
    let width = '1px';

    if (timeRange?.duration <= 86400000) {
      width = '1.5px';
    } else if (timeRange?.duration > 86400000 && timeRange?.duration <= 1209600000) {
      width = '1px';
    } else {
      width = '0.5px';
    }

    //background: repeating-linear-gradient(45deg, rgba(128,128,128,0.5), rgba(128, 128, 128, 0.5) 2px, black 2px, black 4px)

    switch(type) {
      case 'critical':
        style = {left: `${position}%`, backgroundColor: '#f65f56', width: width}
        break;
      case 'warning':
        style = {left: `${position}%`, backgroundColor: '#f07a0e', width: width}
        break;
      case 'muted':
        style = {left: `${position}%`, backgroundColor: 'grey', width: width}
        break;
    }

    return <div className="marker" style={style}/>
  }

  const renderLegend = (type) => {
    let style = '';

    switch(type) {
      case 'critical':
        style = {backgroundColor: '#f65f56'}
        break;
      case 'warning':
        style = {backgroundColor: '#f07a0e'}
        break;
      case 'muted':
        style = {backgroundColor: 'grey'}
        break;
    }

    return (
      <div className="legendItem">
        <div style={style} className="legendColorBox"/>
        <p>{type}</p>
      </div>
    )

  }

  const renderTimeChunks = () => { //manually clamping the `left` value for start/end, so space the rest evenly around those
    const timeChunks = generateTimeChunks();

    if (timeChunks?.length > 0) {
      return (
        timeChunks.map((tc, i) => {
          let splitTc = tc.split(",");
          if (i == 0) {
            return (
              <div>
                <div className="timeChunks" style={{left: '1%'}}>{splitTc[0]}</div>
                <div className="timeChunks" style={{left: '1%', marginTop: '15px'}}>{splitTc[1]}</div>
              </div>
            );
          }

          if (i + 1 === timeChunks.length) {
            return (
              <div>
                <div className="timeChunks" style={{left: '97.5%'}}>{splitTc[0]}</div>
                <div className="timeChunks" style={{left: '97%', marginTop: '15px'}}>{splitTc[1]}</div>
              </div>
            )
          }
          let tcPos = (i/(timeChunks.length - 1))*100
          return (
            <div>
              <div className="timeChunks" style={{left: `${tcPos}%`}}>{splitTc[0]}</div>
              <div className="timeChunks" style={{left: `${tcPos}%`, marginTop: '15px'}}>{splitTc[1]}</div>
            </div>
          );
        })
      )
    }

    return '';
  }


  if (timeline) {
    return (
      <>
        <div className="barContainer">
        {Object.keys(timeline).map((k, i) => {
          if (timeline[k].length > 0) {
            return (
              timeline[k].map(time => {
                return renderMarker(k, time);
              })
            );
          }
        })}
        </div>
        <div style={{display: 'inline'}}>
          {renderTimeChunks()}
        </div>
        <div className="legendContainer">
          {Object.keys(timeline).map((k, i) => {
            return renderLegend(k);
          })}
        </div>
        <br />
      </>
    )
  }

  return '';
}

export default ConditionTimeline;
