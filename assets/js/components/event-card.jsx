import React, { Component } from 'react'
import { Card, Input, Layout, Tabs } from 'antd'

export default class EventCard extends Component {
  render() {
    const { event } = this.props
    const { title, description } = event

    return (
      <Card title={title} style={{ width: 300, margin: 25 }}>
        {description}
      </Card>
    )
  }
}
